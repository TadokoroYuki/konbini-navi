package records

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandler_Health(t *testing.T) {
	h := NewHandler(nil, nil)
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	h.Health(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var body map[string]string
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if body["status"] != "ok" {
		t.Errorf("expected status=ok, got %s", body["status"])
	}
}

func TestHandler_Create_InvalidJSON(t *testing.T) {
	h := NewHandler(nil, nil)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /v1/users/{userId}/records", h.Create)

	body := bytes.NewBufferString(`{invalid json}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/users/user1/records", body)
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

func TestHandler_Create_MissingProductID(t *testing.T) {
	h := NewHandler(nil, nil)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /v1/users/{userId}/records", h.Create)

	payload := map[string]string{"date": "2026-03-20", "mealType": "lunch"}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/v1/users/user1/records", bytes.NewReader(body))
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}

	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["message"] != "productId is required" {
		t.Errorf("expected 'productId is required', got '%s'", resp["message"])
	}
}

func TestHandler_Create_MissingDate(t *testing.T) {
	h := NewHandler(nil, nil)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /v1/users/{userId}/records", h.Create)

	payload := map[string]string{"productId": "prod1", "mealType": "lunch"}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/v1/users/user1/records", bytes.NewReader(body))
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}

	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["message"] != "date is required" {
		t.Errorf("expected 'date is required', got '%s'", resp["message"])
	}
}

func TestHandler_Create_MissingMealType(t *testing.T) {
	h := NewHandler(nil, nil)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /v1/users/{userId}/records", h.Create)

	payload := map[string]string{"productId": "prod1", "date": "2026-03-20"}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/v1/users/user1/records", bytes.NewReader(body))
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}

	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["message"] != "mealType is required" {
		t.Errorf("expected 'mealType is required', got '%s'", resp["message"])
	}
}

func TestHandler_Create_InvalidMealType(t *testing.T) {
	h := NewHandler(nil, nil)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /v1/users/{userId}/records", h.Create)

	payload := map[string]string{"productId": "prod1", "date": "2026-03-20", "mealType": "brunch"}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/v1/users/user1/records", bytes.NewReader(body))
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}

	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["message"] != "Invalid mealType" {
		t.Errorf("expected 'Invalid mealType', got '%s'", resp["message"])
	}
}

func TestHandler_Create_ValidMealTypes_PassValidation(t *testing.T) {
	// Verify that valid meal types pass the validation step
	// by checking they don't return "Invalid mealType"
	validTypes := []string{"breakfast", "lunch", "dinner", "snack"}
	for _, mt := range validTypes {
		t.Run(mt, func(t *testing.T) {
			h := NewHandler(nil, nil)

			mux := http.NewServeMux()
			mux.HandleFunc("POST /v1/users/{userId}/records", h.Create)

			payload := map[string]string{"productId": "prod1", "date": "2026-03-20", "mealType": mt}
			body, _ := json.Marshal(payload)
			req := httptest.NewRequest(http.MethodPost, "/v1/users/user1/records", bytes.NewReader(body))
			w := httptest.NewRecorder()

			// With nil productClient, the handler will panic at GetByID.
			// We recover and verify the meal type validation passed.
			func() {
				defer func() {
					if r := recover(); r != nil {
						// Expected: nil productClient causes panic after meal type validation passes
					}
				}()
				mux.ServeHTTP(w, req)
			}()

			// If we got a response (no panic), check it's not "Invalid mealType"
			if w.Code == http.StatusBadRequest {
				var resp map[string]string
				json.NewDecoder(w.Body).Decode(&resp)
				if resp["message"] == "Invalid mealType" {
					t.Errorf("meal type %q should be valid but was rejected", mt)
				}
			}
		})
	}
}

func TestHandler_Health_ResponseContentType(t *testing.T) {
	h := NewHandler(nil, nil)
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	h.Health(w, req)

	ct := w.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("expected Content-Type=application/json, got %s", ct)
	}
}
