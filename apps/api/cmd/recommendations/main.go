package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/lib/pq"

	nutritionpb "github.com/TadokoroYuki/konbini-navi/apps/api/gen/nutrition"
	productpb "github.com/TadokoroYuki/konbini-navi/apps/api/gen/product"
	recordpb "github.com/TadokoroYuki/konbini-navi/apps/api/gen/record"
	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/middleware"
	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/model"
	"github.com/TadokoroYuki/konbini-navi/apps/api/services/nutrition"
	"github.com/TadokoroYuki/konbini-navi/apps/api/services/products"
	"github.com/TadokoroYuki/konbini-navi/apps/api/services/records"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// カテゴリ一覧 (ベクトルのインデックスに対応)
var categories = []model.Category{
	model.CategoryOnigiri, model.CategoryBento, model.CategorySandwich,
	model.CategorySalad, model.CategorySoup, model.CategoryNoodle,
	model.CategoryBread, model.CategorySweets, model.CategoryDrink,
	model.CategorySideDish,
}

// 栄養素の目標値 (正規化用)
var targets = [6]float64{2000, 65, 55, 300, 20, 8} // calories, protein, fat, carbs, fiber, salt

const (
	nutritionDims = 6
	categoryDims  = 10
	totalDims     = nutritionDims + categoryDims
	alphaWeight   = 0.6 // 栄養不足の重み
	betaWeight    = 0.4 // 味の好みの重み
)

func main() {
	httpPort := getEnv("HTTP_PORT", "2525")
	dbURL := os.Getenv("DATABASE_URL")
	nutritionAddr := getEnv("NUTRITION_GRPC_ADDR", "localhost:1057")
	productsAddr := getEnv("PRODUCTS_GRPC_ADDR", "localhost:7112")
	recordsAddr := getEnv("RECORDS_GRPC_ADDR", "localhost:8811")

	if dbURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("failed to ping database: %v", err)
	}

	nutritionConn, err := grpc.NewClient(nutritionAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("failed to connect to nutrition: %v", err)
	}
	nutritionClient := nutritionpb.NewNutritionServiceClient(nutritionConn)

	productsConn, err := grpc.NewClient(productsAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("failed to connect to products: %v", err)
	}
	productsClient := productpb.NewProductServiceClient(productsConn)

	recordsConn, err := grpc.NewClient(recordsAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("failed to connect to records: %v", err)
	}
	recordsClient := recordpb.NewRecordServiceClient(recordsConn)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /v1/users/{userId}/recommendations", func(w http.ResponseWriter, r *http.Request) {
		userID := r.PathValue("userId")
		date := r.URL.Query().Get("date")
		if date == "" {
			date = time.Now().Format("2006-01-02")
		}

		// キャッシュ確認: recommendations テーブルから取得
		cached, err := getCachedRecommendation(r.Context(), db, userID)
		if err == nil && cached != nil {
			writeJSON(w, 200, map[string]interface{}{
				"recommendation": cached,
			})
			return
		}

		// キャッシュなし → リアルタイム計算
		best, err := computeRecommendation(r.Context(), nutritionClient, productsClient, recordsClient, userID, date)
		if err != nil {
			log.Printf("compute recommendation error: %v", err)
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}

		if best == nil {
			writeJSON(w, 200, map[string]interface{}{
				"recommendation": nil,
			})
			return
		}

		// UPSERT to recommendations table
		if err := upsertRecommendation(r.Context(), db, userID, best.product.ProductID, date, best.score); err != nil {
			log.Printf("failed to upsert recommendation: %v", err)
		}

		writeJSON(w, 200, map[string]interface{}{
			"recommendation": map[string]interface{}{
				"product": best.product,
				"score":   math.Round(best.score*100) / 100,
			},
		})
	})

	mux.HandleFunc("POST /v1/users/{userId}/recommendations/refresh", func(w http.ResponseWriter, r *http.Request) {
		userID := r.PathValue("userId")
		date := time.Now().Format("2006-01-02")

		// キャッシュを削除
		_, _ = db.ExecContext(r.Context(), "DELETE FROM recommendations WHERE user_id = $1", userID)

		// 再計算
		best, err := computeRecommendation(r.Context(), nutritionClient, productsClient, recordsClient, userID, date)
		if err != nil {
			log.Printf("refresh recommendation error: %v", err)
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}

		if best == nil {
			writeJSON(w, 200, map[string]interface{}{"recommendation": nil})
			return
		}

		if err := upsertRecommendation(r.Context(), db, userID, best.product.ProductID, date, best.score); err != nil {
			log.Printf("failed to upsert recommendation: %v", err)
		}

		writeJSON(w, 200, map[string]interface{}{
			"recommendation": map[string]interface{}{
				"product": best.product,
				"score":   math.Round(best.score*100) / 100,
			},
		})
	})

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]string{"status": "ok"})
	})

	httpSrv := &http.Server{
		Addr:    ":" + httpPort,
		Handler: middleware.CORS(mux),
	}
	go func() {
		log.Printf("recommendations HTTP server listening on :%s", httpPort)
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("failed to serve HTTP: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("shutting down recommendations service...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	httpSrv.Shutdown(ctx)
}

type scored struct {
	product model.Product
	score   float64
}

// getCachedRecommendation は recommendations テーブルからキャッシュを取得する
func getCachedRecommendation(ctx context.Context, db *sql.DB, userID string) (map[string]interface{}, error) {
	var productID string
	var score float64
	var date string
	err := db.QueryRowContext(ctx,
		"SELECT product_id, score, date FROM recommendations WHERE user_id = $1", userID,
	).Scan(&productID, &score, &date)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"product_id": productID,
		"score":      score,
		"date":       date,
	}, nil
}

// upsertRecommendation は recommendations テーブルに UPSERT する
func upsertRecommendation(ctx context.Context, db *sql.DB, userID, productID, date string, score float64) error {
	_, err := db.ExecContext(ctx, `
		INSERT INTO recommendations (user_id, product_id, date, score, created_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			product_id = EXCLUDED.product_id,
			date = EXCLUDED.date,
			score = EXCLUDED.score,
			created_at = NOW()
	`, userID, productID, date, math.Round(score*100)/100)
	return err
}

// computeRecommendation は gRPC 経由でデータを取得しスコアリングする
func computeRecommendation(
	ctx context.Context,
	nutritionClient nutritionpb.NutritionServiceClient,
	productsClient productpb.ProductServiceClient,
	recordsClient recordpb.RecordServiceClient,
	userID, date string,
) (*scored, error) {
	// 1. 当日の栄養サマリーを取得
	summaryResp, err := nutritionClient.GetNutrition(ctx, &nutritionpb.GetNutritionRequest{
		UserId: userID,
		Date:   date,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get nutrition: %w", err)
	}
	summary := nutrition.FromProtoNutritionSummary(summaryResp)

	// 2. 全商品を取得
	productsResp, err := productsClient.SearchProducts(ctx, &productpb.SearchProductsRequest{Limit: 100})
	if err != nil {
		return nil, fmt.Errorf("failed to get products: %w", err)
	}
	allProducts := make([]model.Product, len(productsResp.GetProducts()))
	for i, pb := range productsResp.GetProducts() {
		allProducts[i] = products.FromProtoProduct(pb)
	}

	// 3. ユーザーの全履歴を取得
	recordsResp, err := recordsClient.ListAllRecords(ctx, &recordpb.ListAllRecordsRequest{
		UserId: userID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get records: %w", err)
	}
	allRecords := make([]model.Record, len(recordsResp.GetRecords()))
	for i, pb := range recordsResp.GetRecords() {
		allRecords[i] = records.FromProtoRecord(pb)
	}

	// 4. ユーザーニーズベクトルを構築
	userVec := buildUserVector(&summary, allRecords)

	// 5. 各商品をスコアリング
	var results []scored
	for _, p := range allProducts {
		pVec := buildProductVector(p)
		s := alphaWeight*cosineSim(userVec[:nutritionDims], pVec[:nutritionDims]) +
			betaWeight*cosineSim(userVec[nutritionDims:], pVec[nutritionDims:])
		if s > 0 {
			results = append(results, scored{product: p, score: s})
		}
	}

	// ソート (降順)
	for i := 0; i < len(results); i++ {
		maxIdx := i
		for j := i + 1; j < len(results); j++ {
			if results[j].score > results[maxIdx].score {
				maxIdx = j
			}
		}
		results[i], results[maxIdx] = results[maxIdx], results[i]
	}

	if len(results) == 0 {
		return nil, nil
	}
	return &results[0], nil
}

// buildUserVector は16次元のユーザーニーズベクトルを構築する
// [0-5]: 栄養不足 (max(0, target-actual) / target)
// [6-15]: 味の好み (カテゴリ頻度)
func buildUserVector(summary *model.NutritionSummary, recs []model.Record) []float64 {
	vec := make([]float64, totalDims)

	// 栄養不足ベクトル: max(0, target - actual) を target で正規化
	deficits := [6]float64{
		math.Max(0, summary.Calories.Target-summary.Calories.Actual),
		math.Max(0, summary.Protein.Target-summary.Protein.Actual),
		math.Max(0, summary.Fat.Target-summary.Fat.Actual),
		math.Max(0, summary.Carbs.Target-summary.Carbs.Actual),
		0, // fiber (NutritionSummaryに含まれない → 0)
		0, // salt
	}
	for i := 0; i < nutritionDims; i++ {
		if targets[i] > 0 {
			vec[i] = deficits[i] / targets[i]
		}
	}

	// 味の好みベクトル: 過去の記録のカテゴリ出現頻度
	if len(recs) > 0 {
		catCount := make(map[model.Category]int)
		for _, rec := range recs {
			if rec.Product != nil {
				catCount[rec.Product.Category]++
			}
		}
		total := float64(len(recs))
		for i, cat := range categories {
			vec[nutritionDims+i] = float64(catCount[cat]) / total
		}
	}

	return vec
}

// buildProductVector は16次元の商品ベクトルを構築する
// [0-5]: 栄養素値 (各栄養素 / target で正規化)
// [6-15]: カテゴリ one-hot
func buildProductVector(p model.Product) []float64 {
	vec := make([]float64, totalDims)

	// 栄養素ベクトル
	nutrients := [6]float64{
		p.Nutrition.Calories, p.Nutrition.Protein, p.Nutrition.Fat,
		p.Nutrition.Carbs, p.Nutrition.Fiber, p.Nutrition.Salt,
	}
	for i := 0; i < nutritionDims; i++ {
		if targets[i] > 0 {
			vec[i] = nutrients[i] / targets[i]
		}
	}

	// カテゴリ one-hot
	for i, cat := range categories {
		if p.Category == cat {
			vec[nutritionDims+i] = 1.0
			break
		}
	}

	return vec
}

// cosineSim はコサイン類似度を計算する
func cosineSim(a, b []float64) float64 {
	var dot, normA, normB float64
	for i := range a {
		dot += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}
	denom := math.Sqrt(normA) * math.Sqrt(normB)
	if denom == 0 {
		return 0
	}
	return dot / denom
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
