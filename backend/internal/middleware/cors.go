package middleware

import (
	"strings"

	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
)

// CORS returns Echo CORS middleware configured with allowed origins.
func CORS(allowedOrigins string) echo.MiddlewareFunc {
	origins := []string{"*"}
	if allowedOrigins != "" {
		rawOrigins := strings.Split(allowedOrigins, ",")
		var cleanOrigins []string
		for _, o := range rawOrigins {
			trimmed := strings.TrimSpace(o)
			if trimmed != "" {
				cleanOrigins = append(cleanOrigins, trimmed)
			}
		}
		if len(cleanOrigins) > 0 {
			origins = cleanOrigins
		}
	}

	return echomw.CORSWithConfig(echomw.CORSConfig{
		AllowOrigins:     origins,
		AllowMethods:     []string{echo.GET, echo.POST, echo.PUT, echo.PATCH, echo.DELETE, echo.OPTIONS, echo.HEAD},
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization, "X-Requested-With"},
		AllowCredentials: true,
	})
}
