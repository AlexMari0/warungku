package middleware

import (
	"errors"
	"fmt"
	"net/http"
	"warungku-backend/internal/apperror"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
)

type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details,omitempty"`
}

// CustomHTTPErrorHandler handles errors from handlers and middleware, standardizing JSON output.
func CustomHTTPErrorHandler(err error, c echo.Context) {
	if c.Response().Committed {
		return
	}

	var appErr *apperror.AppError
	if errors.As(err, &appErr) {
		_ = c.JSON(appErr.StatusCode, ErrorResponse{
			Code:    appErr.Code,
			Message: appErr.Message,
			Details: appErr.Details,
		})
		return
	}

	var valErrs validator.ValidationErrors
	if errors.As(err, &valErrs) {
		validationDetails := make(map[string]string)
		for _, fe := range valErrs {
			validationDetails[fe.Field()] = fmt.Sprintf("failed rule: %s", fe.Tag())
		}
		_ = c.JSON(http.StatusUnprocessableEntity, ErrorResponse{
			Code:    "VALIDATION_ERROR",
			Message: "Validasi data input gagal.",
			Details: validationDetails,
		})
		return
	}

	var echoHttpErr *echo.HTTPError
	if errors.As(err, &echoHttpErr) {
		msg := fmt.Sprintf("%v", echoHttpErr.Message)
		code := "HTTP_ERROR"
		if echoHttpErr.Code == http.StatusNotFound {
			code = "NOT_FOUND"
		} else if echoHttpErr.Code == http.StatusUnauthorized {
			code = "UNAUTHORIZED"
		} else if echoHttpErr.Code == http.StatusForbidden {
			code = "FORBIDDEN"
		}

		_ = c.JSON(echoHttpErr.Code, ErrorResponse{
			Code:    code,
			Message: msg,
		})
		return
	}

	// Unhandled error fallback
	c.Logger().Errorf("[Unhandled Error] %v", err)
	_ = c.JSON(http.StatusInternalServerError, ErrorResponse{
		Code:    "INTERNAL_ERROR",
		Message: err.Error(),
	})
}
