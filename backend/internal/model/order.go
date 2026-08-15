package model

import (
	"time"

	"github.com/google/uuid"
)

type Order struct {
	ID             uuid.UUID    `json:"id" db:"id"`
	MerchantID     uuid.UUID    `json:"merchant_id" db:"merchant_id"`
	CustomerID     *uuid.UUID   `json:"customer_id" db:"customer_id"`
	OrderNumber    string       `json:"order_number" db:"order_number"`
	Status         string       `json:"status" db:"status"`
	Subtotal       float64      `json:"subtotal" db:"subtotal"`
	DiscountAmount float64      `json:"discount_amount" db:"discount_amount"`
	TotalAmount    float64      `json:"total_amount" db:"total_amount"`
	Notes          *string      `json:"notes" db:"notes"`
	CreatedAt      time.Time    `json:"created_at" db:"created_at"`
	Customer       *Customer    `json:"customer,omitempty"`
	Items          []OrderItem  `json:"items,omitempty"`
	Payment        *Payment     `json:"payment,omitempty"`
	Receipt        *Receipt     `json:"receipt,omitempty"`
}

type OrderItem struct {
	ID        uuid.UUID `json:"id" db:"id"`
	OrderID   uuid.UUID `json:"order_id" db:"order_id"`
	ProductID uuid.UUID `json:"product_id" db:"product_id"`
	Name      string    `json:"name,omitempty"`
	Unit      string    `json:"unit,omitempty"`
	Quantity  int       `json:"quantity" db:"quantity"`
	UnitPrice float64   `json:"unit_price" db:"unit_price"`
	Discount  float64   `json:"discount" db:"discount"`
	Subtotal  float64   `json:"subtotal" db:"subtotal"`
}

type CheckoutItemRequest struct {
	ProductID uuid.UUID `json:"product_id" validate:"required"`
	Quantity  int       `json:"quantity" validate:"required,gt=0"`
	Discount  float64   `json:"discount" validate:"gte=0"`
}

type CheckoutRequest struct {
	Items          []CheckoutItemRequest `json:"items" validate:"required,min=1,dive"`
	PaymentMethod  string                `json:"payment_method" validate:"required,oneof=cash qris gopay ovo dana transfer"`
	PaidAmount     *float64              `json:"paid_amount" validate:"omitempty,gte=0"`
	CustomerID     *string               `json:"customer_id" validate:"omitempty"`
	DiscountAmount float64               `json:"discount_amount" validate:"gte=0"`
	Notes          *string               `json:"notes" validate:"omitempty,max=500"`
}

type CheckoutResult struct {
	Order        Order     `json:"order"`
	Items        []OrderItem `json:"items"`
	Payment      *Payment   `json:"payment"`
	Receipt      *Receipt   `json:"receipt"`
	Customer     *Customer  `json:"customer"`
	PointsEarned int       `json:"points_earned"`
}
