package middleware

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strings"

	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/httputil"
)

// Auth validates that the authenticated user (from Cognito JWT token)
// matches the userId in the URL path.
//
// In production: validates Authorization Bearer token (Cognito ID token)
// In development: skips validation
func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip auth validation in development mode
		if os.Getenv("ENV") == "development" {
			next.ServeHTTP(w, r)
			return
		}

		// Get userId from URL path (e.g., /v1/users/{userId}/records)
		pathUserID := r.PathValue("userId")

		// Public endpoints (e.g., /v1/products) don't require authentication
		if pathUserID == "" {
			next.ServeHTTP(w, r)
			return
		}

		// User-specific endpoints require JWT authentication
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			httputil.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		userID, err := extractUserIDFromJWT(token)
		if err != nil {
			httputil.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid token")
			return
		}

		// Validate authenticated user matches the userId in path
		if pathUserID != userID {
			httputil.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Access denied: user mismatch")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// extractUserIDFromJWT extracts the 'sub' claim from a JWT token (without signature verification for demo)
func extractUserIDFromJWT(token string) (string, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return "", errors.New("invalid token format")
	}

	// Decode payload (second part)
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", err
	}

	var claims map[string]interface{}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return "", err
	}

	sub, ok := claims["sub"].(string)
	if !ok || sub == "" {
		return "", errors.New("missing sub claim")
	}

	return sub, nil
}
