package model

import (
	"time"

	"github.com/google/uuid"
)

type Payment struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	OrderID         uuid.UUID  `json:"order_id" db:"order_id"`
	Method          string     `json:"method" db:"method"`
	Amount          float64    `json:"amount" db:"amount"`
	ChangeAmount    float64    `json:"change_amount" db:"change_amount"`
	ReferenceNumber *string    `json:"reference_number" db:"reference_number"`
	Status          string     `json:"status" db:"status"`
	PaidAt          *time.Time `json:"paid_at" db:"paid_at"`
}

type Receipt struct {
	ID            uuid.UUID `json:"id" db:"id"`
	OrderID       uuid.UUID `json:"order_id" db:"order_id"`
	ReceiptNumber string    `json:"receipt_number" db:"receipt_number"`
	SentVia       string    `json:"sent_via" db:"sent_via"`
	SentAt        time.Time `json:"sent_at" db:"sent_at"`
}
