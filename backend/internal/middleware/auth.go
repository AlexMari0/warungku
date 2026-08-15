package middleware

import (
	"fmt"
	"strings"
	"warungku-backend/internal/apperror"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

const (
	ContextKeyMerchantID = "merchant_id"
	ContextKeyUserEmail  = "user_email"
	ContextKeyUserClaims = "user_claims"
)

type SupabaseClaims struct {
	Email string `json:"email"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
}

// Auth creates an Echo middleware to authenticate requests with a Supabase JWT token.
func Auth(jwtSecret string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return apperror.ErrUnauthorized
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				return apperror.ErrUnauthorized
			}

			tokenStr := strings.TrimSpace(parts[1])
			if tokenStr == "" {
				return apperror.ErrUnauthorized
			}

			claims := &SupabaseClaims{}

			var token *jwt.Token
			var err error

			if jwtSecret != "" {
				token, err = jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
					// Verify signing algorithm is HMAC
					if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
						return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
					}
					return []byte(jwtSecret), nil
				})
			} else {
				// Development fallback when secret is omitted: parse unverified token
				parser := jwt.NewParser()
				token, _, err = parser.ParseUnverified(tokenStr, claims)
			}

			if err != nil || token == nil {
				return apperror.ErrUnauthorized
			}

			// Validate subject (User ID = Merchant ID)
			sub, err := claims.GetSubject()
			if err != nil || sub == "" {
				return apperror.ErrUnauthorized
			}

			merchantUUID, err := uuid.Parse(sub)
			if err != nil {
				return apperror.ErrUnauthorized
			}

			// Set context values
			c.Set(ContextKeyMerchantID, merchantUUID)
			c.Set(ContextKeyUserEmail, claims.Email)
			c.Set(ContextKeyUserClaims, claims)

			return next(c)
		}
	}
}

// GetMerchantID extracts the authenticated merchant UUID from Echo context.
func GetMerchantID(c echo.Context) uuid.UUID {
	val := c.Get(ContextKeyMerchantID)
	if uid, ok := val.(uuid.UUID); ok {
		return uid
	}
	return uuid.Nil
}

// GetUserEmail extracts the authenticated user email from Echo context.
func GetUserEmail(c echo.Context) string {
	val := c.Get(ContextKeyUserEmail)
	if email, ok := val.(string); ok {
		return email
	}
	return ""
}
