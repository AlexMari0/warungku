package handler

import (
	"net/http"
	"warungku-backend/internal/apperror"
	"warungku-backend/internal/middleware"
	"warungku-backend/internal/model"
	"warungku-backend/internal/repo"
	"warungku-backend/internal/service"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type ProductHandler struct {
	svc *service.ProductService
}

func NewProductHandler(svc *service.ProductService) *ProductHandler {
	return &ProductHandler{svc: svc}
}

func (h *ProductHandler) Register(g *echo.Group) {
	g.GET("/products", h.List)
	g.GET("/products/sales-frequency", h.SalesFrequency)
	g.GET("/products/:id", h.Get)
	g.POST("/products", h.Create)
	g.PATCH("/products/:id", h.Update)
	g.PATCH("/products/:id/toggle", h.ToggleActive)
	g.DELETE("/products/:id", h.Delete)
}

func (h *ProductHandler) List(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	activeOnly := c.QueryParam("active_only") == "true"
	orderBy := c.QueryParam("order_by")
	orderAsc := c.QueryParam("order_asc") == "true"

	opts := repo.FindProductOptions{
		ActiveOnly:     activeOnly,
		OrderBy:        orderBy,
		OrderAscending: orderAsc,
	}

	products, err := h.svc.ListProducts(c.Request().Context(), merchantID, opts)
	if err != nil {
		return err
	}
	if products == nil {
		products = []model.Product{}
	}
	return c.JSON(http.StatusOK, products)
}

func (h *ProductHandler) Get(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return apperror.ErrValidation("ID produk tidak valid.")
	}

	product, err := h.svc.GetProduct(c.Request().Context(), merchantID, id)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, product)
}

func (h *ProductHandler) Create(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	var req model.CreateProductRequest
	if err := c.Bind(&req); err != nil {
		return apperror.ErrValidation("Format data tidak valid.")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	product, err := h.svc.CreateProduct(c.Request().Context(), merchantID, req)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, product)
}

func (h *ProductHandler) Update(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return apperror.ErrValidation("ID produk tidak valid.")
	}

	var req model.UpdateProductRequest
	if err := c.Bind(&req); err != nil {
		return apperror.ErrValidation("Format data tidak valid.")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	product, err := h.svc.UpdateProduct(c.Request().Context(), merchantID, id, req)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, product)
}

func (h *ProductHandler) ToggleActive(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return apperror.ErrValidation("ID produk tidak valid.")
	}

	var req model.ToggleActiveRequest
	if err := c.Bind(&req); err != nil {
		return apperror.ErrValidation("Format data tidak valid.")
	}

	if err := h.svc.ToggleActive(c.Request().Context(), merchantID, id, req.IsActive); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "is_active": req.IsActive})
}

func (h *ProductHandler) Delete(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return apperror.ErrValidation("ID produk tidak valid.")
	}

	if err := h.svc.DeleteProduct(c.Request().Context(), merchantID, id); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true})
}

func (h *ProductHandler) SalesFrequency(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	freq, err := h.svc.FetchSalesFrequency(c.Request().Context(), merchantID)
	if err != nil {
		return err
	}
	if freq == nil {
		freq = make(map[string]int)
	}
	return c.JSON(http.StatusOK, freq)
}
