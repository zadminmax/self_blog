package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/internal/pkg/jwtutil"
	"github.com/selfblog/backend/internal/service"
	"github.com/selfblog/backend/pkg/response"
)

func JWTAuth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			response.ErrUnauthorized(c, "missing token")
			c.Abort()
			return
		}
		raw := strings.TrimSpace(strings.TrimPrefix(h, "Bearer "))
		claims, err := jwtutil.Parse(secret, raw)
		if err != nil {
			response.ErrUnauthorized(c, "invalid token")
			c.Abort()
			return
		}
		c.Set("userID", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("permissions", claims.Permissions)
		c.Next()
	}
}

// LoadPermissionsFromDB overwrites JWT permission claims with the user's current roles from DB.
// New permissions (e.g. after seed/migration) apply without forcing re-login.
func LoadPermissionsFromDB(auth *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := c.Get("userID")
		if !ok {
			response.ErrForbidden(c, "permission denied")
			c.Abort()
			return
		}
		userID, ok := uid.(int64)
		if !ok {
			response.ErrForbidden(c, "permission denied")
			c.Abort()
			return
		}
		perms, err := auth.UserPermissions(userID)
		if err != nil {
			response.ErrUnauthorized(c, "invalid token")
			c.Abort()
			return
		}
		c.Set("permissions", perms)
		c.Next()
	}
}

func RequirePermission(perm string) gin.HandlerFunc {
	return func(c *gin.Context) {
		v, ok := c.Get("permissions")
		if !ok {
			response.ErrForbidden(c, "permission denied")
			c.Abort()
			return
		}
		list, _ := v.([]string)
		for _, p := range list {
			if p == perm {
				c.Next()
				return
			}
		}
		response.ErrForbidden(c, "permission denied")
		c.Abort()
	}
}
