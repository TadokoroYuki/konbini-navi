package records

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"time"

	"github.com/oklog/ulid/v2"

	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/httputil"
	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/model"
)

type Handler struct {
	repo               *Repository
	productClient      *ProductClient
	recommendationsURL string
}

func NewHandler(repo *Repository, productClient *ProductClient, recommendationsURL string) *Handler {
	return &Handler{repo: repo, productClient: productClient, recommendationsURL: recommendationsURL}
}

// refreshRecommendation は recommendations サービスに再計算を非同期で依頼する
var refreshClient = &http.Client{Timeout: 10 * time.Second}

func (h *Handler) refreshRecommendation(userID string) {
	if h.recommendationsURL == "" {
		return
	}
	go func() {
		refreshURL := h.recommendationsURL + "/v1/users/" + url.PathEscape(userID) + "/recommendations/refresh"
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		req, err := http.NewRequestWithContext(ctx, "POST", refreshURL, nil)
		if err != nil {
			log.Printf("failed to create refresh request: %v", err)
			return
		}
		resp, err := refreshClient.Do(req)
		if err != nil {
			log.Printf("failed to refresh recommendation for %s: %v", userID, err)
			return
		}
		resp.Body.Close()
		log.Printf("refreshed recommendation for user %s (status: %d)", userID, resp.StatusCode)
	}()
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userId")
	date := r.URL.Query().Get("date")

	records, err := h.repo.ListByUserAndDate(r.Context(), userID, date)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "INTERNAL", "Failed to list records")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, map[string]interface{}{"records": records})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userId")

	var req model.CreateRecordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.ProductID == "" {
		httputil.WriteError(w, http.StatusBadRequest, "BAD_REQUEST", "productId is required")
		return
	}
	if req.Date == "" {
		httputil.WriteError(w, http.StatusBadRequest, "BAD_REQUEST", "date is required")
		return
	}
	if req.MealType == "" {
		httputil.WriteError(w, http.StatusBadRequest, "BAD_REQUEST", "mealType is required")
		return
	}

	switch req.MealType {
	case model.MealTypeBreakfast, model.MealTypeLunch, model.MealTypeDinner, model.MealTypeSnack:
	default:
		httputil.WriteError(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid mealType")
		return
	}

	// Verify product exists via gRPC
	product, err := h.productClient.GetByID(r.Context(), req.ProductID)
	if err != nil || product == nil {
		httputil.WriteError(w, http.StatusBadRequest, "BAD_REQUEST", "Product not found")
		return
	}

	recordID := ulid.MustNew(ulid.Timestamp(time.Now()), rand.Reader).String()

	record := &model.Record{
		RecordID:  recordID,
		UserID:    userID,
		ProductID: req.ProductID,
		Product:   product,
		Date:      req.Date,
		MealType:  req.MealType,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}

	if err := h.repo.Create(r.Context(), record); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "INTERNAL", "Failed to create record")
		return
	}

	h.refreshRecommendation(userID)
	httputil.WriteJSON(w, http.StatusCreated, record)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userId")
	recordID := r.PathValue("recordId")

	if err := h.repo.Delete(r.Context(), userID, recordID); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "INTERNAL", "Failed to delete record")
		return
	}

	h.refreshRecommendation(userID)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	httputil.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
