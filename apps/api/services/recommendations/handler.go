package recommendations

import (
	"net/http"
	"time"

	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/httputil"
)

type Handler struct {
	engine   *Engine
	analyzer *Analyzer
}

func NewHandler(engine *Engine, analyzer *Analyzer) *Handler {
	return &Handler{engine: engine, analyzer: analyzer}
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userId")
	date := r.URL.Query().Get("date")

	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	recommendations, err := h.engine.Recommend(r.Context(), userID, date)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "INTERNAL", "Failed to get recommendations")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, map[string]interface{}{"recommendations": recommendations})
}

func (h *Handler) GetAnalysis(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userId")
	date := r.URL.Query().Get("date")

	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	analysis, err := h.analyzer.Analyze(r.Context(), userID, date)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "INTERNAL", "Failed to generate analysis")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, analysis)
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	httputil.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
