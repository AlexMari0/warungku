package handler

import (
	"context"
	"net/http"
	"strconv"
	"time"
	"warungku-backend/internal/apperror"
	"warungku-backend/internal/middleware"
	"warungku-backend/internal/model"
	"warungku-backend/internal/service"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type CheckoutHandler struct {
	svc       *service.CheckoutService
	reportSvc *service.ReportService
}

func NewCheckoutHandler(svc *service.CheckoutService, reportSvc *service.ReportService) *CheckoutHandler {
	return &CheckoutHandler{svc: svc, reportSvc: reportSvc}
}

func (h *CheckoutHandler) Register(g *echo.Group) {
	g.POST("/checkout", h.Process)
	g.GET("/checkout/recent", h.Recent)
}

func (h *CheckoutHandler) Process(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	var req model.CheckoutRequest
	if err := c.Bind(&req); err != nil {
		return apperror.ErrValidation("Format data transaksi tidak valid.")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	result, err := h.svc.ProcessCheckout(c.Request().Context(), merchantID, req)
	if err != nil {
		return err
	}

	// Asynchronously trigger analytics refresh for today
	go func(mID uuid.UUID) {
		bgCtx := context.Background()
		today := time.Now().Format("2006-01-02")
		if err := h.reportSvc.RefreshAnalytics(bgCtx, mID, today); err != nil {
			// Just log the error, don't break the flow
			_ = err
		}
	}(merchantID)

	return c.JSON(http.StatusOK, result)
}

func (h *CheckoutHandler) Recent(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	limit := 20
	if lStr := c.QueryParam("limit"); lStr != "" {
		if parsed, err := strconv.Atoi(lStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	orders, err := h.svc.GetRecentOrders(c.Request().Context(), merchantID, limit)
	if err != nil {
		return err
	}
	if orders == nil {
		orders = []model.Order{}
	}
	return c.JSON(http.StatusOK, orders)
}
