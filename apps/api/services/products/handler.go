package products

import (
	"net/http"
	"strconv"

	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/httputil"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) Search(w http.ResponseWriter, r *http.Request) {
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

	products, err := h.repo.Search(r.Context(), query, brand, category, limit)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "INTERNAL", "Failed to search products")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, map[string]interface{}{"products": products})
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	productID := r.PathValue("productId")
	if productID == "" {
		httputil.WriteError(w, http.StatusBadRequest, "BAD_REQUEST", "productId is required")
		return
	}

	product, err := h.repo.GetByID(r.Context(), productID)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "INTERNAL", "Failed to get product")
		return
	}
	if product == nil {
		httputil.WriteError(w, http.StatusNotFound, "NOT_FOUND", "Product not found")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, product)
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	httputil.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
