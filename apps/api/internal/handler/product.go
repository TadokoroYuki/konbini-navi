package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/repository"
)

// ProductHandler handles product-related requests.
type ProductHandler struct {
	productRepo repository.ProductRepository
}

// NewProductHandler creates a new ProductHandler.
func NewProductHandler(productRepo repository.ProductRepository) *ProductHandler {
	return &ProductHandler{productRepo: productRepo}
}

// List handles GET /v1/products
func (h *ProductHandler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	brand := r.URL.Query().Get("brand")
	category := r.URL.Query().Get("category")
	limitStr := r.URL.Query().Get("limit")

	limit := 20
	if limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	products, err := h.productRepo.Search(r.Context(), query, brand, category, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to search products")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"products": products})
}

// Get handles GET /v1/products/{productId}
func (h *ProductHandler) Get(w http.ResponseWriter, r *http.Request) {
	productId := chi.URLParam(r, "productId")
	if productId == "" {
		writeError(w, http.StatusBadRequest, "productId is required")
		return
	}

	product, err := h.productRepo.GetByID(r.Context(), productId)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get product")
		return
	}

	if product == nil {
		writeError(w, http.StatusNotFound, "Product not found")
		return
	}

	writeJSON(w, http.StatusOK, product)
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
