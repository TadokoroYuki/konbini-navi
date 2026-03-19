package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/service"
)

// RecommendHandler handles recommendation requests.
type RecommendHandler struct {
	engine *service.RecommendationEngine
}

// NewRecommendHandler creates a new RecommendHandler.
func NewRecommendHandler(engine *service.RecommendationEngine) *RecommendHandler {
	return &RecommendHandler{engine: engine}
}

// Get handles GET /v1/users/{userId}/recommendations
func (h *RecommendHandler) Get(w http.ResponseWriter, r *http.Request) {
	userId := chi.URLParam(r, "userId")
	date := r.URL.Query().Get("date")

	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	recommendations, err := h.engine.Recommend(r.Context(), userId, date)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get recommendations")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"recommendations": recommendations})
}
