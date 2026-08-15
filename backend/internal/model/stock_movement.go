package model

import (
	"time"

	"github.com/google/uuid"
)

type StockMovementProductJoined struct {
	Name string  `json:"name"`
	Unit string  `json:"unit"`
	SKU  *string `json:"sku"`
}

type StockMovement struct {
	ID            uuid.UUID                   `json:"id" db:"id"`
	ProductID     uuid.UUID                   `json:"product_id" db:"product_id"`
	SupplierID    *uuid.UUID                  `json:"supplier_id" db:"supplier_id"`
	Type          string                      `json:"type" db:"type"`
	Quantity      int                         `json:"quantity" db:"quantity"`
	QtyBefore     int                         `json:"qty_before" db:"qty_before"`
	QtyAfter      int                         `json:"qty_after" db:"qty_after"`
	UnitCost      *float64                    `json:"unit_cost" db:"unit_cost"`
	ReferenceID   *string                     `json:"reference_id" db:"reference_id"`
	ReferenceType *string                     `json:"reference_type" db:"reference_type"`
	Notes         *string                     `json:"notes" db:"notes"`
	CreatedAt     time.Time                   `json:"created_at" db:"created_at"`
	Products      *StockMovementProductJoined `json:"products,omitempty" db:"-"`
}

type CreateStockMovementRequest struct {
	ProductID uuid.UUID `json:"product_id" validate:"required"`
	Type      string    `json:"type" validate:"required,oneof=purchase sale adjustment return waste"`
	Quantity  int       `json:"quantity" validate:"required,ne=0"`
	UnitCost  *float64  `json:"unit_cost" validate:"omitempty,gte=0"`
	Notes     *string   `json:"notes" validate:"omitempty,max=500"`
}
