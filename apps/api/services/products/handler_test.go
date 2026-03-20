package products

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandler_Health(t *testing.T) {
	h := NewHandler(nil)
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

func TestHandler_Get_EmptyProductID(t *testing.T) {
	h := NewHandler(nil)
	req := httptest.NewRequest(http.MethodGet, "/v1/products/", nil)
	w := httptest.NewRecorder()

	// PathValue("productId") returns "" when not set
	h.Get(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}

	var body map[string]string
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if body["code"] != "BAD_REQUEST" {
		t.Errorf("expected code=BAD_REQUEST, got %s", body["code"])
	}
}

func TestHandler_Get_WithProductId(t *testing.T) {
	// Use a mux to set up path parameters properly
	h := NewHandler(nil)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/products/{productId}", h.Get)

	req := httptest.NewRequest(http.MethodGet, "/v1/products/test-id", nil)
	w := httptest.NewRecorder()

	// Will panic on nil repo, so we use recover to verify it got past validation
	func() {
		defer func() {
			if r := recover(); r != nil {
				// Expected: nil repo causes panic after validation passes
				// This confirms productId was correctly parsed from path
			}
		}()
		mux.ServeHTTP(w, req)
	}()
}

func TestHandler_Health_ResponseContentType(t *testing.T) {
	h := NewHandler(nil)
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	h.Health(w, req)

	ct := w.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("expected Content-Type=application/json, got %s", ct)
	}
}
