package handler

import (
	"net/http"
	"warungku-backend/internal/apperror"
	"warungku-backend/internal/middleware"
	"warungku-backend/internal/model"
	"warungku-backend/internal/service"

	"github.com/labstack/echo/v4"
)

type ReportHandler struct {
	svc *service.ReportService
}

func NewReportHandler(svc *service.ReportService) *ReportHandler {
	return &ReportHandler{svc: svc}
}

func (h *ReportHandler) Register(g *echo.Group) {
	g.GET("/reports/dashboard", h.Dashboard)
	g.POST("/reports/refresh", h.Refresh)
}

func (h *ReportHandler) Dashboard(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	period := c.QueryParam("period")
	if period == "" {
		period = "today"
	}
	customStart := c.QueryParam("start_date")
	customEnd := c.QueryParam("end_date")

	dashboard, err := h.svc.FetchDashboard(c.Request().Context(), merchantID, period, customStart, customEnd)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, dashboard)
}

func (h *ReportHandler) Refresh(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	var req model.RefreshAnalyticsRequest
	if err := c.Bind(&req); err != nil {
		return apperror.ErrValidation("Format data refresh tidak valid.")
	}

	if err := h.svc.RefreshAnalytics(c.Request().Context(), merchantID, req.Date); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true})
}
