package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/middleware"
)

// NewRouter creates a new chi router with all routes configured.
func NewRouter(
	productHandler *ProductHandler,
	recordHandler *RecordHandler,
	nutritionHandler *NutritionHandler,
	recommendHandler *RecommendHandler,
) *chi.Mux {
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.RequestID)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Device-Id"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	// API routes
	r.Route("/v1", func(r chi.Router) {
		// Auth middleware for all /v1 routes
		r.Use(middleware.Auth)

		// Products
		r.Get("/products", productHandler.List)
		r.Get("/products/{productId}", productHandler.Get)

		// User-specific routes
		r.Route("/users/{userId}", func(r chi.Router) {
			r.Get("/records", recordHandler.List)
			r.Post("/records", recordHandler.Create)
			r.Delete("/records/{recordId}", recordHandler.Delete)
			r.Get("/nutrition", nutritionHandler.Get)
			r.Get("/recommendations", recommendHandler.Get)
		})
	})

	return r
}
