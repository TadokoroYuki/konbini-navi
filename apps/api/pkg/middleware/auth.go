package middleware

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"
)

type contextKey string

const UserIDKey contextKey = "userId"

type sessionResponse struct {
	Session *struct {
		UserID string `json:"userId"`
	} `json:"session"`
}

func Auth(next http.Handler) http.Handler {
	authURL := os.Getenv("AUTH_SERVICE_URL")
	if authURL == "" {
		authURL = "http://localhost:4000"
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try Bearer token first
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			token := strings.TrimPrefix(authHeader, "Bearer ")
			userID, err := validateToken(authURL, token)
			if err == nil && userID != "" {
				ctx := context.WithValue(r.Context(), UserIDKey, userID)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}
		}

		// Fallback: X-Device-Id header (backward compatibility)
		deviceID := r.Header.Get("X-Device-Id")
		if deviceID != "" {
			ctx := context.WithValue(r.Context(), UserIDKey, deviceID)
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		http.Error(w, `{"code":"UNAUTHORIZED","message":"認証が必要です"}`, http.StatusUnauthorized)
	})
}

func validateToken(authURL, token string) (string, error) {
	req, err := http.NewRequest("GET", authURL+"/api/auth/get-session", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", nil
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var session sessionResponse
	if err := json.Unmarshal(body, &session); err != nil {
		return "", err
	}

	if session.Session == nil {
		return "", nil
	}

	return session.Session.UserID, nil
}

func GetUserID(r *http.Request) string {
	if v, ok := r.Context().Value(UserIDKey).(string); ok {
		return v
	}
	return ""
}
