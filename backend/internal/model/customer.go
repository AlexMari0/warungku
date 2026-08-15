package model

import (
	"time"

	"github.com/google/uuid"
)

type Customer struct {
	ID            uuid.UUID `json:"id" db:"id"`
	MerchantID    uuid.UUID `json:"merchant_id" db:"merchant_id"`
	Name          string    `json:"name" db:"name"`
	Phone         *string   `json:"phone" db:"phone"`
	TotalDebt     float64   `json:"total_debt" db:"total_debt"`
	LoyaltyPoints int       `json:"loyalty_points" db:"loyalty_points"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

type CreateCustomerRequest struct {
	Name  string  `json:"name" validate:"required,min=2,max=100"`
	Phone *string `json:"phone" validate:"omitempty,max=30"`
}
