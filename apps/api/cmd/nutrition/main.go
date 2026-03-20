package main

import (
	"context"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"google.golang.org/grpc"

	nutritionpb "github.com/TadokoroYuki/konbini-navi/apps/api/gen/nutrition"
	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/middleware"
	"github.com/TadokoroYuki/konbini-navi/apps/api/services/nutrition"
)

func main() {
	httpPort := getEnv("HTTP_PORT", "1056")
	grpcPort := getEnv("GRPC_PORT", "1057")
	recordsGRPC := getEnv("RECORDS_GRPC_ADDR", "localhost:8811")

	recordClient, err := nutrition.NewRecordClient(recordsGRPC)
	if err != nil {
		log.Fatalf("failed to connect to records service: %v", err)
	}

	calculator := nutrition.NewCalculator(recordClient)
	handler := nutrition.NewHandler(calculator)
	grpcServer := nutrition.NewGRPCServer(calculator)

	// gRPC server
	grpcSrv := grpc.NewServer()
	nutritionpb.RegisterNutritionServiceServer(grpcSrv, grpcServer)
	go func() {
		lis, err := net.Listen("tcp", ":"+grpcPort)
		if err != nil {
			log.Fatalf("failed to listen gRPC: %v", err)
		}
		log.Printf("nutrition gRPC server listening on :%s", grpcPort)
		if err := grpcSrv.Serve(lis); err != nil {
			log.Fatalf("failed to serve gRPC: %v", err)
		}
	}()

	// HTTP server
	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/users/{userId}/nutrition", handler.Get)
	mux.HandleFunc("GET /health", handler.Health)

	httpSrv := &http.Server{
		Addr:    ":" + httpPort,
		Handler: middleware.CORS(mux),
	}
	go func() {
		log.Printf("nutrition HTTP server listening on :%s", httpPort)
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("failed to serve HTTP: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("shutting down nutrition service...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	grpcSrv.GracefulStop()
	httpSrv.Shutdown(ctx)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
