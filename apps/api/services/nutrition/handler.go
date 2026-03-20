package nutrition

import (
	"net/http"
	"time"

	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/httputil"
)

type Handler struct {
	calculator *Calculator
}

func NewHandler(calculator *Calculator) *Handler {
	return &Handler{calculator: calculator}
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userId")
	date := r.URL.Query().Get("date")

	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	summary, err := h.calculator.Calculate(r.Context(), userID, date)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "INTERNAL", "Failed to calculate nutrition")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, summary)
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	httputil.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
