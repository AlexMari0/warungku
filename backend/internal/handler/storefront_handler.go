package handler

import (
	"net/http"
	"warungku-backend/internal/apperror"
	"warungku-backend/internal/middleware"
	"warungku-backend/internal/model"
	"warungku-backend/internal/service"

	"github.com/labstack/echo/v4"
)

type StorefrontHandler struct {
	svc *service.StorefrontService
}

func NewStorefrontHandler(svc *service.StorefrontService) *StorefrontHandler {
	return &StorefrontHandler{svc: svc}
}

func (h *StorefrontHandler) RegisterProtected(g *echo.Group) {
	g.GET("/storefront/settings", h.GetSettings)
	g.PATCH("/storefront/settings", h.SaveSettings)
	g.GET("/storefront/check-slug", h.CheckSlug)
}

func (h *StorefrontHandler) RegisterPublic(g *echo.Group) {
	g.GET("/store/:slug", h.PublicCatalog)
	g.POST("/store/:slug/track", h.TrackEvent)
	g.POST("/store/:slug/order", h.CreateOrder)
}

func (h *StorefrontHandler) GetSettings(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	userEmail := middleware.GetUserEmail(c)

	res, err := h.svc.GetSettings(c.Request().Context(), merchantID, userEmail)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, res)
}

func (h *StorefrontHandler) SaveSettings(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	var req model.SaveStorefrontSettingsRequest
	if err := c.Bind(&req); err != nil {
		return apperror.ErrValidation("Format data pengaturan toko tidak valid.")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	res, err := h.svc.SaveSettings(c.Request().Context(), merchantID, req)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, res)
}

func (h *StorefrontHandler) CheckSlug(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	slug := c.QueryParam("slug")
	if slug == "" {
		return apperror.ErrValidation("Query parameter slug wajib diisi.")
	}

	available, err := h.svc.CheckSlug(c.Request().Context(), merchantID, slug)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"available": available, "slug": slug})
}

func (h *StorefrontHandler) PublicCatalog(c echo.Context) error {
	slug := c.Param("slug")
	catalog, err := h.svc.GetPublicCatalog(c.Request().Context(), slug)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, catalog)
}

func (h *StorefrontHandler) TrackEvent(c echo.Context) error {
	slug := c.Param("slug")
	var req model.TrackEventRequest
	if err := c.Bind(&req); err != nil {
		return apperror.ErrValidation("Format data tracking tidak valid.")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	if err := h.svc.TrackEvent(c.Request().Context(), slug, req.EventType); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true})
}

func (h *StorefrontHandler) CreateOrder(c echo.Context) error {
	slug := c.Param("slug")
	var req model.CreateOnlineOrderRequest
	if err := c.Bind(&req); err != nil {
		return apperror.ErrValidation("Format pesanan online tidak valid.")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	order, err := h.svc.CreateOnlineOrder(c.Request().Context(), slug, req)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, order)
}
