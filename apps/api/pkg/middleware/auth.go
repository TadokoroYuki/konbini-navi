package middleware

import (
	"net/http"
	"os"

	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/httputil"
)

// Auth validates that the authenticated user (from ALB Cognito header)
// matches the userId in the URL path.
//
// In production: validates x-amzn-oidc-identity (set by ALB after Cognito auth)
// In development: uses X-Device-Id as fallback
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

		// User-specific endpoints require ALB Cognito authentication
		authenticatedUserID := r.Header.Get("x-amzn-oidc-identity")
		if authenticatedUserID == "" {
			httputil.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
			return
		}

		// Validate authenticated user matches the userId in path
		if pathUserID != authenticatedUserID {
			httputil.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Access denied: user mismatch")
			return
		}

		next.ServeHTTP(w, r)
	})
}
