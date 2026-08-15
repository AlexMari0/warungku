package apperror

import (
	"fmt"
	"net/http"
)

// AppError represents a standardized domain error that can be mapped to an HTTP response.
type AppError struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	StatusCode int    `json:"-"`
	Details    any    `json:"details,omitempty"`
}

func (e *AppError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func New(code string, message string, statusCode int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
	}
}

func WithDetails(err *AppError, details any) *AppError {
	return &AppError{
		Code:       err.Code,
		Message:    err.Message,
		StatusCode: err.StatusCode,
		Details:    details,
	}
}

// Common Predefined App Errors
var (
	ErrUnauthorized     = New("UNAUTHORIZED", "Anda harus login untuk mengakses data ini.", http.StatusUnauthorized)
	ErrForbidden        = New("FORBIDDEN", "Akses ditolak.", http.StatusForbidden)
	ErrNotFound         = func(resource string) *AppError {
		return New("NOT_FOUND", fmt.Sprintf("%s tidak ditemukan.", resource), http.StatusNotFound)
	}
	ErrValidation       = func(msg string) *AppError {
		return New("VALIDATION_ERROR", msg, http.StatusUnprocessableEntity)
	}
	ErrConflict         = func(msg string) *AppError {
		return New("CONFLICT", msg, http.StatusConflict)
	}
	ErrInsufficientStock = New("INSUFFICIENT_STOCK", "Stok barang tidak mencukupi untuk transaksi ini.", http.StatusUnprocessableEntity)
	ErrInsufficientPay   = New("INSUFFICIENT_PAYMENT", "Nominal pembayaran lebih kecil dari total belanja.", http.StatusUnprocessableEntity)
	ErrInternal          = New("INTERNAL_ERROR", "Terjadi kesalahan internal pada server.", http.StatusInternalServerError)
)
