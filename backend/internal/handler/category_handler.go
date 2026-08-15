package handler

import (
	"net/http"
	"warungku-backend/internal/apperror"
	"warungku-backend/internal/middleware"
	"warungku-backend/internal/model"
	"warungku-backend/internal/service"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type CategoryHandler struct {
	svc *service.CategoryService
}

func NewCategoryHandler(svc *service.CategoryService) *CategoryHandler {
	return &CategoryHandler{svc: svc}
}

func (h *CategoryHandler) Register(g *echo.Group) {
	g.GET("/categories", h.List)
	g.POST("/categories", h.Create)
	g.PATCH("/categories/:id", h.Update)
	g.DELETE("/categories/:id", h.Delete)
}

func (h *CategoryHandler) List(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	categories, err := h.svc.ListCategories(c.Request().Context(), merchantID)
	if err != nil {
		return err
	}
	if categories == nil {
		categories = []model.Category{}
	}
	return c.JSON(http.StatusOK, categories)
}

func (h *CategoryHandler) Create(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	var req model.CreateCategoryRequest
	if err := c.Bind(&req); err != nil {
		return apperror.ErrValidation("Format data tidak valid.")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	category, err := h.svc.CreateCategory(c.Request().Context(), merchantID, req)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, category)
}

func (h *CategoryHandler) Update(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return apperror.ErrValidation("ID kategori tidak valid.")
	}

	var req model.UpdateCategoryRequest
	if err := c.Bind(&req); err != nil {
		return apperror.ErrValidation("Format data tidak valid.")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	category, err := h.svc.UpdateCategory(c.Request().Context(), merchantID, id, req)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, category)
}

func (h *CategoryHandler) Delete(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return apperror.ErrValidation("ID kategori tidak valid.")
	}

	if err := h.svc.DeleteCategory(c.Request().Context(), merchantID, id); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true})
}
