package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	"warungku-backend/internal/config"
	"warungku-backend/internal/handler"
	"warungku-backend/internal/middleware"
	"warungku-backend/internal/repo"
	"warungku-backend/internal/service"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
)

func main() {
	// 1. Load Configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("[Main] Failed to load configuration: %v", err)
	}

	// 2. Connect to PostgreSQL (Supabase)
	if cfg.DatabaseURL == "" {
		log.Fatalf("[Main] DATABASE_URL environment variable is required")
	}

	poolConfig, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("[Main] Invalid database connection string: %v", err)
	}

	poolConfig.MaxConns = 25
	poolConfig.MinConns = 2
	poolConfig.MaxConnLifetime = 1 * time.Hour
	poolConfig.MaxConnIdleTime = 30 * time.Minute

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		log.Fatalf("[Main] Could not initialize database connection pool: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Printf("[Main] Warning: database initial ping returned: %v (continuing)", err)
	} else {
		log.Println("[Main] Connected to PostgreSQL database pool successfully")
	}

	// 3. Initialize Repositories
	categoryRepo := repo.NewCategoryRepo(pool)
	productRepo := repo.NewProductRepo(pool)
	customerRepo := repo.NewCustomerRepo(pool)
	stockMovementRepo := repo.NewStockMovementRepo(pool)
	orderRepo := repo.NewOrderRepo(pool)
	storefrontRepo := repo.NewStorefrontRepo(pool)
	reportRepo := repo.NewReportRepo(pool)
	aiRepo := repo.NewAIRepo(pool)

	// 4. Initialize Services
	categorySvc := service.NewCategoryService(categoryRepo)
	productSvc := service.NewProductService(productRepo, stockMovementRepo)
	customerSvc := service.NewCustomerService(customerRepo)
	stockMovementSvc := service.NewStockMovementService(stockMovementRepo, productRepo)
	checkoutSvc := service.NewCheckoutService(orderRepo)
	storefrontSvc := service.NewStorefrontService(storefrontRepo, productRepo)
	reportSvc := service.NewReportService(reportRepo)
	aiSvc := service.NewAIService(aiRepo)

	// 5. Initialize Handlers
	categoryHandler := handler.NewCategoryHandler(categorySvc)
	productHandler := handler.NewProductHandler(productSvc)
	customerHandler := handler.NewCustomerHandler(customerSvc)
	stockMovementHandler := handler.NewStockMovementHandler(stockMovementSvc)
	checkoutHandler := handler.NewCheckoutHandler(checkoutSvc)
	storefrontHandler := handler.NewStorefrontHandler(storefrontSvc)
	reportHandler := handler.NewReportHandler(reportSvc)
	aiHandler := handler.NewAIHandler(aiSvc)

	// 6. Initialize Echo Server
	e := echo.New()
	e.HideBanner = true
	e.Validator = middleware.NewValidator()
	e.HTTPErrorHandler = middleware.CustomHTTPErrorHandler

	// Global Middlewares
	e.Use(echomw.Recover())
	e.Use(echomw.LoggerWithConfig(echomw.LoggerConfig{
		Format: "[${time_rfc3339}] ${status} ${method} ${uri} (${latency_human})\n",
	}))
	e.Use(middleware.CORS(cfg.AllowedOrigins))

	// 7. Route Registration
	// Health Check
	e.GET("/api/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]any{
			"status":      "ok",
			"app":         "WarungKu API",
			"version":     "1.0.0",
			"environment": cfg.Environment,
			"timestamp":   time.Now().UTC().Format(time.RFC3339),
		})
	})

	// Public Routes Group (No Auth Required)
	pub := e.Group("/api/public")
	storefrontHandler.RegisterPublic(pub)

	// Protected Routes Group (Supabase JWT Auth Required)
	api := e.Group("/api", middleware.Auth(cfg.SupabaseJWTSecret))
	categoryHandler.Register(api)
	productHandler.Register(api)
	customerHandler.Register(api)
	stockMovementHandler.Register(api)
	checkoutHandler.Register(api)
	storefrontHandler.RegisterProtected(api)
	reportHandler.Register(api)
	aiHandler.Register(api)

	// 8. Start Server with Graceful Shutdown
	go func() {
		addr := fmt.Sprintf(":%s", cfg.Port)
		log.Printf("🚀 WarungKu API server listening on %s [%s mode]", addr, cfg.Environment)
		if err := e.Start(addr); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[Main] Server startup error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("[Main] Shutting down server gracefully...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := e.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("[Main] Forced shutdown: %v", err)
	}

	log.Println("[Main] Server exited cleanly")
}
