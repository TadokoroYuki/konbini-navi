package handler

import (
	"crypto/rand"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/oklog/ulid/v2"

	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/model"
	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/repository"
)

// RecordHandler handles record-related requests.
type RecordHandler struct {
	recordRepo  repository.RecordRepository
	productRepo repository.ProductRepository
}

// NewRecordHandler creates a new RecordHandler.
func NewRecordHandler(recordRepo repository.RecordRepository, productRepo repository.ProductRepository) *RecordHandler {
	return &RecordHandler{
		recordRepo:  recordRepo,
		productRepo: productRepo,
	}
}

// List handles GET /v1/users/{userId}/records
func (h *RecordHandler) List(w http.ResponseWriter, r *http.Request) {
	userId := chi.URLParam(r, "userId")
	date := r.URL.Query().Get("date")

	records, err := h.recordRepo.ListByUserAndDate(r.Context(), userId, date)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to list records")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"records": records})
}

// Create handles POST /v1/users/{userId}/records
func (h *RecordHandler) Create(w http.ResponseWriter, r *http.Request) {
	userId := chi.URLParam(r, "userId")

	var req model.CreateRecordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate required fields
	if req.ProductID == "" {
		writeError(w, http.StatusBadRequest, "productId is required")
		return
	}
	if req.Date == "" {
		writeError(w, http.StatusBadRequest, "date is required")
		return
	}
	if req.MealType == "" {
		writeError(w, http.StatusBadRequest, "mealType is required")
		return
	}

	// Validate meal type
	switch req.MealType {
	case model.MealTypeBreakfast, model.MealTypeLunch, model.MealTypeDinner, model.MealTypeSnack:
		// valid
	default:
		writeError(w, http.StatusBadRequest, "Invalid mealType")
		return
	}

	// Verify product exists
	product, err := h.productRepo.GetByID(r.Context(), req.ProductID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to verify product")
		return
	}
	if product == nil {
		writeError(w, http.StatusBadRequest, "Product not found")
		return
	}

	recordID := ulid.MustNew(ulid.Timestamp(time.Now()), rand.Reader).String()

	record := &model.Record{
		RecordID:  recordID,
		UserID:    userId,
		ProductID: req.ProductID,
		Product:   product,
		Date:      req.Date,
		MealType:  req.MealType,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}

	if err := h.recordRepo.Create(r.Context(), record); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create record")
		return
	}

	writeJSON(w, http.StatusCreated, record)
}

// Delete handles DELETE /v1/users/{userId}/records/{recordId}
func (h *RecordHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userId := chi.URLParam(r, "userId")
	recordId := chi.URLParam(r, "recordId")

	if err := h.recordRepo.Delete(r.Context(), userId, recordId); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to delete record")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
