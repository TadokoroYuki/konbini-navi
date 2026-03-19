package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/service"
)

// NutritionHandler handles nutrition-related requests.
type NutritionHandler struct {
	calculator *service.NutritionCalculator
}

// NewNutritionHandler creates a new NutritionHandler.
func NewNutritionHandler(calculator *service.NutritionCalculator) *NutritionHandler {
	return &NutritionHandler{calculator: calculator}
}

// Get handles GET /v1/users/{userId}/nutrition
func (h *NutritionHandler) Get(w http.ResponseWriter, r *http.Request) {
	userId := chi.URLParam(r, "userId")
	date := r.URL.Query().Get("date")

	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	summary, err := h.calculator.Calculate(r.Context(), userId, date)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to calculate nutrition")
		return
	}

	writeJSON(w, http.StatusOK, summary)
}
