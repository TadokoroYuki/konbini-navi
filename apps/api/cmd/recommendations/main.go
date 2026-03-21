package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/middleware"
	"github.com/TadokoroYuki/konbini-navi/apps/api/services/recommendations"
)

func main() {
	httpPort := getEnv("HTTP_PORT", "2525")
	nutritionGRPC := getEnv("NUTRITION_GRPC_ADDR", "localhost:1057")
	productsGRPC := getEnv("PRODUCTS_GRPC_ADDR", "localhost:7112")

	nutritionClient, err := recommendations.NewNutritionClient(nutritionGRPC)
	if err != nil {
		log.Fatalf("failed to connect to nutrition service: %v", err)
	}

	productClient, err := recommendations.NewProductClient(productsGRPC)
	if err != nil {
		log.Fatalf("failed to connect to products service: %v", err)
	}

	engine := recommendations.NewEngine(nutritionClient, productClient)
	handler := recommendations.NewHandler(engine)

	// HTTP server only (no gRPC - not called by other services)
	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/users/{userId}/recommendations", handler.Get)
	mux.HandleFunc("GET /health", handler.Health)

	// Apply middleware: CORS -> Auth
	httpSrv := &http.Server{
		Addr:    ":" + httpPort,
		Handler: middleware.CORS(middleware.Auth(mux)),
	}
	go func() {
		log.Printf("recommendations HTTP server listening on :%s", httpPort)
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("failed to serve HTTP: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("shutting down recommendations service...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	httpSrv.Shutdown(ctx)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
