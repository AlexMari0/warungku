package handler

import (
	"net/http"
	"strconv"
	"warungku-backend/internal/apperror"
	"warungku-backend/internal/middleware"
	"warungku-backend/internal/model"
	"warungku-backend/internal/repo"
	"warungku-backend/internal/service"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type StockMovementHandler struct {
	svc *service.StockMovementService
}

func NewStockMovementHandler(svc *service.StockMovementService) *StockMovementHandler {
	return &StockMovementHandler{svc: svc}
}

func (h *StockMovementHandler) Register(g *echo.Group) {
	g.GET("/stock-movements", h.List)
	g.POST("/stock-movements", h.Create)
}

func (h *StockMovementHandler) List(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)

	var productID *uuid.UUID
	if pIDStr := c.QueryParam("product_id"); pIDStr != "" {
		if parsed, err := uuid.Parse(pIDStr); err == nil {
			productID = &parsed
		}
	}

	var movType *string
	if tStr := c.QueryParam("type"); tStr != "" {
		movType = &tStr
	}

	limit := 100
	if lStr := c.QueryParam("limit"); lStr != "" {
		if parsed, err := strconv.Atoi(lStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	opts := repo.FindMovementOptions{
		ProductID:    productID,
		MovementType: movType,
		Limit:        limit,
	}

	movements, err := h.svc.ListMovements(c.Request().Context(), merchantID, opts)
	if err != nil {
		return err
	}
	if movements == nil {
		movements = []model.StockMovement{}
	}
	return c.JSON(http.StatusOK, movements)
}

func (h *StockMovementHandler) Create(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	var req model.CreateStockMovementRequest
	if err := c.Bind(&req); err != nil {
		return apperror.ErrValidation("Format data tidak valid.")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	movement, err := h.svc.CreateMovement(c.Request().Context(), merchantID, req)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, movement)
}
