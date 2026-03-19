package middleware

import (
	"context"
	"net/http"
)

type contextKey string

const userIDKey contextKey = "userId"

// Auth is a middleware that extracts the X-Device-Id header and sets it in the context.
func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		deviceID := r.Header.Get("X-Device-Id")
		if deviceID == "" {
			http.Error(w, `{"error":"X-Device-Id header is required"}`, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, deviceID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetUserID retrieves the user ID from the context.
func GetUserID(ctx context.Context) string {
	v, _ := ctx.Value(userIDKey).(string)
	return v
}
