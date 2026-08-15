package model

import (
	"time"

	"github.com/google/uuid"
)

type ProductCategoryJoined struct {
	Name  string  `json:"name"`
	Color *string `json:"color"`
}

type Product struct {
	ID         uuid.UUID              `json:"id" db:"id"`
	MerchantID uuid.UUID              `json:"merchant_id" db:"merchant_id"`
	CategoryID *uuid.UUID             `json:"category_id" db:"category_id"`
	Name       string                 `json:"name" db:"name"`
	SKU        *string                `json:"sku" db:"sku"`
	Barcode    *string                `json:"barcode" db:"barcode"`
	SellPrice  float64                `json:"sell_price" db:"sell_price"`
	BuyPrice   float64                `json:"buy_price" db:"buy_price"`
	StockQty   int                    `json:"stock_qty" db:"stock_qty"`
	MinStock   int                    `json:"min_stock" db:"min_stock"`
	Unit       string                 `json:"unit" db:"unit"`
	ImageURL   *string                `json:"image_url" db:"image_url"`
	IsActive   bool                   `json:"is_active" db:"is_active"`
	CreatedAt  time.Time              `json:"created_at" db:"created_at"`
	Categories *ProductCategoryJoined `json:"categories,omitempty" db:"-"`
}

type CreateProductRequest struct {
	Name       string   `json:"name" validate:"required,min=2,max=200"`
	CategoryID *string  `json:"category_id" validate:"omitempty"`
	SKU        *string  `json:"sku" validate:"omitempty,max=50"`
	Barcode    *string  `json:"barcode" validate:"omitempty,max=100"`
	SellPrice  float64  `json:"sell_price" validate:"required,gte=0"`
	BuyPrice   float64  `json:"buy_price" validate:"gte=0"`
	StockQty   int      `json:"stock_qty" validate:"gte=0"`
	MinStock   int      `json:"min_stock" validate:"gte=0"`
	Unit       string   `json:"unit" validate:"required,max=20"`
	ImageURL   *string  `json:"image_url" validate:"omitempty,url|startswith=http"`
	IsActive   *bool    `json:"is_active" validate:"omitempty"`
}

type UpdateProductRequest struct {
	Name       *string  `json:"name" validate:"omitempty,min=2,max=200"`
	CategoryID *string  `json:"category_id" validate:"omitempty"`
	SKU        *string  `json:"sku" validate:"omitempty,max=50"`
	Barcode    *string  `json:"barcode" validate:"omitempty,max=100"`
	SellPrice  *float64 `json:"sell_price" validate:"omitempty,gte=0"`
	BuyPrice   *float64 `json:"buy_price" validate:"omitempty,gte=0"`
	StockQty   *int     `json:"stock_qty" validate:"omitempty,gte=0"`
	MinStock   *int     `json:"min_stock" validate:"omitempty,gte=0"`
	Unit       *string  `json:"unit" validate:"omitempty,max=20"`
	ImageURL   *string  `json:"image_url" validate:"omitempty"`
	IsActive   *bool    `json:"is_active" validate:"omitempty"`
}

type ToggleActiveRequest struct {
	IsActive bool `json:"is_active"`
}
