package model

import (
	"time"

	"github.com/google/uuid"
)

type DailySummary struct {
	ID                       uuid.UUID  `json:"id" db:"id"`
	MerchantID               uuid.UUID  `json:"merchant_id" db:"merchant_id"`
	SummaryDate              string     `json:"summary_date" db:"summary_date"`
	TotalOrders              int        `json:"total_orders" db:"total_orders"`
	TotalRevenue             float64    `json:"total_revenue" db:"total_revenue"`
	TotalCOGS                float64    `json:"total_cogs" db:"total_cogs"`
	GrossProfit              float64    `json:"gross_profit" db:"gross_profit"`
	TotalDiscount            float64    `json:"total_discount" db:"total_discount"`
	TotalItemsSold           int        `json:"total_items_sold" db:"total_items_sold"`
	AvgTransaction           float64    `json:"avg_transaction" db:"avg_transaction"`
	TopPaymentMethod         *string    `json:"top_payment_method" db:"top_payment_method"`
	StorefrontPageViews      int        `json:"storefront_page_views" db:"storefront_page_views"`
	StorefrontWhatsappClicks int        `json:"storefront_whatsapp_clicks" db:"storefront_whatsapp_clicks"`
	StorefrontConversions    int        `json:"storefront_conversions" db:"storefront_conversions"`
	RefreshedAt              time.Time  `json:"refreshed_at" db:"refreshed_at"`
}

type HourlyTraffic struct {
	ID          uuid.UUID `json:"id" db:"id"`
	MerchantID  uuid.UUID `json:"merchant_id" db:"merchant_id"`
	SummaryDate string    `json:"summary_date" db:"summary_date"`
	HourBucket  int       `json:"hour_bucket" db:"hour_bucket"`
	OrderCount  int       `json:"order_count" db:"order_count"`
	Revenue     float64   `json:"revenue" db:"revenue"`
}

type ProductSalesSummary struct {
	ID             uuid.UUID `json:"id" db:"id"`
	MerchantID     uuid.UUID `json:"merchant_id" db:"merchant_id"`
	ProductID      uuid.UUID `json:"product_id" db:"product_id"`
	PeriodType     string    `json:"period_type" db:"period_type"`
	PeriodStart    string    `json:"period_start" db:"period_start"`
	QuantitySold   int       `json:"quantity_sold" db:"quantity_sold"`
	Revenue        float64   `json:"revenue" db:"revenue"`
	COGS           float64   `json:"cogs" db:"cogs"`
	GrossProfit    float64   `json:"gross_profit" db:"gross_profit"`
	ReturnQuantity int       `json:"return_quantity" db:"return_quantity"`

	// Joined
	Name     string  `json:"name,omitempty"`
	SKU      *string `json:"sku,omitempty"`
	Category string  `json:"category,omitempty"`
	Color    *string `json:"color,omitempty"`
}

type PaymentMethodSummary struct {
	ID               uuid.UUID `json:"id" db:"id"`
	MerchantID       uuid.UUID `json:"merchant_id" db:"merchant_id"`
	PeriodType       string    `json:"period_type" db:"period_type"`
	PeriodStart      string    `json:"period_start" db:"period_start"`
	Method           string    `json:"method" db:"method"`
	TransactionCount int       `json:"transaction_count" db:"transaction_count"`
	TotalAmount      float64   `json:"total_amount" db:"total_amount"`
}

type SummaryComparison struct {
	TotalRevenue             float64 `json:"total_revenue"`
	GrossProfit              float64 `json:"gross_profit"`
	TotalOrders              int     `json:"total_orders"`
	AvgTransaction           float64 `json:"avg_transaction"`
	StorefrontPageViews      int     `json:"storefront_page_views"`
	StorefrontWhatsappClicks int     `json:"storefront_whatsapp_clicks"`
	StorefrontConversions    int     `json:"storefront_conversions"`
}

type DashboardResponse struct {
	Summary           *DailySummary          `json:"summary"`
	SummaryComparison SummaryComparison      `json:"summary_comparison"`
	HourlyTraffic     []HourlyTraffic        `json:"hourly_traffic"`
	ProductSales      []ProductSalesSummary  `json:"product_sales"`
	PaymentSummaries  []PaymentMethodSummary `json:"payment_summaries"`
}

type RefreshAnalyticsRequest struct {
	Date string `json:"date" validate:"omitempty,datetime=2006-01-02"`
}
