package nutrition

import (
	"encoding/json"
	"net/http"

	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/httputil"
	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/model"
)

type ProfileHandler struct {
	repo *ProfileRepository
}

func NewProfileHandler(repo *ProfileRepository) *ProfileHandler {
	return &ProfileHandler{repo: repo}
}

func (h *ProfileHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userId")

	profile, err := h.repo.GetByUserID(r.Context(), userID)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "INTERNAL", "Failed to get profile")
		return
	}
	if profile == nil {
		httputil.WriteJSON(w, http.StatusOK, &model.UserProfile{UserID: userID})
		return
	}

	httputil.WriteJSON(w, http.StatusOK, profile)
}

func (h *ProfileHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userId")

	var profile model.UserProfile
	if err := json.NewDecoder(r.Body).Decode(&profile); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "INVALID_BODY", "Invalid request body")
		return
	}
	profile.UserID = userID

	if err := h.repo.Upsert(r.Context(), &profile); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "INTERNAL", "Failed to save profile")
		return
	}

	saved, _ := h.repo.GetByUserID(r.Context(), userID)
	if saved == nil {
		saved = &profile
	}
	httputil.WriteJSON(w, http.StatusOK, saved)
}
