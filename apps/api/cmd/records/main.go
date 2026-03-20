package main

import (
	"context"
	"database/sql"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/lib/pq"
	"google.golang.org/grpc"

	recordpb "github.com/TadokoroYuki/konbini-navi/apps/api/gen/record"
	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/middleware"
	"github.com/TadokoroYuki/konbini-navi/apps/api/services/records"
)

func main() {
	httpPort := getEnv("HTTP_PORT", "8810")
	grpcPort := getEnv("GRPC_PORT", "8811")
	dbURL := os.Getenv("DATABASE_URL")
	productsGRPC := getEnv("PRODUCTS_GRPC_ADDR", "localhost:7112")

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

	productClient, err := records.NewProductClient(productsGRPC)
	if err != nil {
		log.Fatalf("failed to connect to products service: %v", err)
	}

	repo := records.NewRepository(db, productClient)
	handler := records.NewHandler(repo, productClient)
	grpcServer := records.NewGRPCServer(repo, productClient)

	// gRPC server
	grpcSrv := grpc.NewServer()
	recordpb.RegisterRecordServiceServer(grpcSrv, grpcServer)
	go func() {
		lis, err := net.Listen("tcp", ":"+grpcPort)
		if err != nil {
			log.Fatalf("failed to listen gRPC: %v", err)
		}
		log.Printf("records gRPC server listening on :%s", grpcPort)
		if err := grpcSrv.Serve(lis); err != nil {
			log.Fatalf("failed to serve gRPC: %v", err)
		}
	}()

	// HTTP server
	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/users/{userId}/records", handler.List)
	mux.HandleFunc("POST /v1/users/{userId}/records", handler.Create)
	mux.HandleFunc("DELETE /v1/users/{userId}/records/{recordId}", handler.Delete)
	mux.HandleFunc("GET /health", handler.Health)

	httpSrv := &http.Server{
		Addr:    ":" + httpPort,
		Handler: middleware.CORS(mux),
	}
	go func() {
		log.Printf("records HTTP server listening on :%s", httpPort)
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("failed to serve HTTP: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("shutting down records service...")

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
