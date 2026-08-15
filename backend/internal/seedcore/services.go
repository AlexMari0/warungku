package seedcore

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"warungku-backend/internal/service"
)

// Services aggregates all application services needed by seed scenarios.
// It also exposes the raw db pool for operations that fall outside domain logic
// (such as bypassing RLS to insert mock users or handling seed migrations).
type Services struct {
	DB *pgxpool.Pool

	Category      *service.CategoryService
	Product       *service.ProductService
	Checkout      *service.CheckoutService
	Customer      *service.CustomerService
	StockMovement *service.StockMovementService
	Storefront    *service.StorefrontService
	Report        *service.ReportService
	AI            *service.AIService
}
