package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	_ "github.com/lib/pq"

	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/handler"
	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/repository"
	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/service"
)

// getEnv gets an environment variable with a default value
func getEnv(key, defaultVal string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultVal
}

func main() {
	// Initialize PostgreSQL connection
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "postgres")
	dbName := getEnv("DB_NAME", "konbini_navi")

	psqlInfo := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)

	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	// Verify database connection
	err = db.Ping()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	log.Println("Connected to PostgreSQL successfully")

	// Initialize repositories
	productRepo := repository.NewPostgresProductRepository(db)
	recordRepo := repository.NewPostgresRecordRepository(db, productRepo)

	// Initialize services
	calculator := service.NewNutritionCalculator(recordRepo, productRepo)
	engine := service.NewRecommendationEngine(calculator, productRepo)

	// Initialize handlers
	productHandler := handler.NewProductHandler(productRepo)
	recordHandler := handler.NewRecordHandler(recordRepo, productRepo)
	nutritionHandler := handler.NewNutritionHandler(calculator)
	recommendHandler := handler.NewRecommendHandler(engine)

	// Set up router
	router := handler.NewRouter(productHandler, recordHandler, nutritionHandler, recommendHandler)

	// Start HTTP server
	addr := ":8080"
	log.Printf("Starting HTTP server on %s", addr)
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
