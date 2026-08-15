package model

import (
	"time"

	"github.com/google/uuid"
)

type AISession struct {
	ID              uuid.UUID      `json:"id" db:"id"`
	MerchantID      uuid.UUID      `json:"merchant_id" db:"merchant_id"`
	Title           string         `json:"title" db:"title"`
	ContextSnapshot map[string]any `json:"context_snapshot,omitempty" db:"context_snapshot"`
	LastActiveAt    time.Time      `json:"last_active_at" db:"last_active_at"`
	CreatedAt       time.Time      `json:"created_at" db:"created_at"`
}

type AIQueryLog struct {
	ID           uuid.UUID `json:"id" db:"id"`
	SessionID    uuid.UUID `json:"session_id" db:"session_id"`
	MerchantID   uuid.UUID `json:"merchant_id" db:"merchant_id"`
	QueryText    string    `json:"query_text" db:"query_text"`
	ResponseText *string   `json:"response_text" db:"response_text"`
	QueryType    string    `json:"query_type" db:"query_type"`
	TokensUsed   int       `json:"tokens_used" db:"tokens_used"`
	LatencyMs    *int      `json:"latency_ms" db:"latency_ms"`
	ModelVersion string    `json:"model_version" db:"model_version"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	Rating       *string   `json:"rating,omitempty" db:"-"`
}

type AIFeedback struct {
	ID           uuid.UUID `json:"id" db:"id"`
	QueryLogID   uuid.UUID `json:"query_log_id" db:"query_log_id"`
	MerchantID   uuid.UUID `json:"merchant_id" db:"merchant_id"`
	Rating       string    `json:"rating" db:"rating"`
	FeedbackText *string   `json:"feedback_text" db:"feedback_text"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

type CreateSessionRequest struct {
	Title string `json:"title" validate:"omitempty,max=100"`
}

type ChatRequest struct {
	SessionID uuid.UUID `json:"session_id" validate:"required"`
	QueryText string    `json:"query_text" validate:"required,min=1,max=2000"`
	QueryType *string   `json:"query_type" validate:"omitempty,oneof=analysis recommendation forecast content_gen anomaly"`
}

type ChatResponse struct {
	Success bool       `json:"success"`
	Message AIQueryLog `json:"message"`
}

type SubmitFeedbackRequest struct {
	QueryLogID   uuid.UUID `json:"query_log_id" validate:"required"`
	Rating       string    `json:"rating" validate:"required,oneof=helpful not_helpful"`
	FeedbackText *string   `json:"feedback_text" validate:"omitempty,max=1000"`
}
