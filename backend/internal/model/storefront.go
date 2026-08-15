package model

import (
	"time"

	"github.com/google/uuid"
)

type Storefront struct {
	ID           uuid.UUID `json:"id" db:"id"`
	MerchantID   uuid.UUID `json:"merchant_id" db:"merchant_id"`
	Slug         string    `json:"slug" db:"slug"`
	DisplayName  string    `json:"display_name" db:"display_name"`
	Description  *string   `json:"description" db:"description"`
	BannerURL    *string   `json:"banner_url" db:"banner_url"`
	ThemeColor   string    `json:"theme_color" db:"theme_color"`
	IsPublished  bool      `json:"is_published" db:"is_published"`
	CustomDomain *string   `json:"custom_domain" db:"custom_domain"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

type StorefrontProduct struct {
	ID                uuid.UUID `json:"id" db:"id"`
	StorefrontID      uuid.UUID `json:"storefront_id" db:"storefront_id"`
	ProductID         uuid.UUID `json:"product_id" db:"product_id"`
	IsFeatured        bool      `json:"is_featured" db:"is_featured"`
	SortOrder         int       `json:"sort_order" db:"sort_order"`
	CustomDescription *string   `json:"custom_description" db:"custom_description"`
	Products          *Product  `json:"products,omitempty" db:"-"`
}

type OnlineOrder struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	StorefrontID  uuid.UUID  `json:"storefront_id" db:"storefront_id"`
	CustomerID    *uuid.UUID `json:"customer_id" db:"customer_id"`
	CustomerName  string     `json:"customer_name" db:"customer_name"`
	CustomerPhone string     `json:"customer_phone" db:"customer_phone"`
	Status        string     `json:"status" db:"status"`
	TotalAmount   float64    `json:"total_amount" db:"total_amount"`
	Notes         *string    `json:"notes" db:"notes"`
	WAMessageID   *string    `json:"wa_message_id" db:"wa_message_id"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
}

type StorefrontProductMapItem struct {
	IsLinked          bool   `json:"is_linked"`
	IsFeatured        bool   `json:"is_featured"`
	CustomDescription string `json:"custom_description"`
}

type SaveStorefrontSettingsRequest struct {
	Slug                 string                              `json:"slug" validate:"required,min=3,max=50"`
	DisplayName          string                              `json:"display_name" validate:"required,min=2,max=100"`
	Description          *string                             `json:"description" validate:"omitempty,max=500"`
	BannerURL            *string                             `json:"banner_url" validate:"omitempty,url|startswith=http"`
	ThemeColor           string                              `json:"theme_color" validate:"required,oneof=emerald sky violet rose amber neutral"`
	IsPublished          bool                                `json:"is_published"`
	StorefrontProductsMap map[string]StorefrontProductMapItem `json:"storefront_products_map"`
}

type StorefrontSettingsResponse struct {
	Storefront            Storefront                          `json:"storefront"`
	StorefrontProductsMap map[string]StorefrontProductMapItem `json:"storefront_products_map"`
}

type PublicStorefrontCatalog struct {
	Storefront       Storefront          `json:"storefront"`
	Categories       []Category          `json:"categories"`
	FeaturedProducts []StorefrontProduct `json:"featured_products"`
	Catalog          []StorefrontProduct `json:"catalog"`
}

type TrackEventRequest struct {
	EventType string `json:"event_type" validate:"required,oneof=page_view whatsapp_click"`
}

type CreateOnlineOrderRequest struct {
	CustomerName  string  `json:"customer_name" validate:"required,min=2,max=100"`
	CustomerPhone string  `json:"customer_phone" validate:"required,min=8,max=30"`
	TotalAmount   float64 `json:"total_amount" validate:"required,gte=0"`
	Notes         *string `json:"notes" validate:"omitempty,max=500"`
}
