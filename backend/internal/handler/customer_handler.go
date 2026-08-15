package handler

import (
	"net/http"
	"warungku-backend/internal/apperror"
	"warungku-backend/internal/middleware"
	"warungku-backend/internal/model"
	"warungku-backend/internal/service"

	"github.com/labstack/echo/v4"
)

type CustomerHandler struct {
	svc *service.CustomerService
}

func NewCustomerHandler(svc *service.CustomerService) *CustomerHandler {
	return &CustomerHandler{svc: svc}
}

func (h *CustomerHandler) Register(g *echo.Group) {
	g.GET("/customers", h.List)
	g.POST("/customers", h.Create)
}

func (h *CustomerHandler) List(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	customers, err := h.svc.ListCustomers(c.Request().Context(), merchantID)
	if err != nil {
		return err
	}
	if customers == nil {
		customers = []model.Customer{}
	}
	return c.JSON(http.StatusOK, customers)
}

func (h *CustomerHandler) Create(c echo.Context) error {
	merchantID := middleware.GetMerchantID(c)
	var req model.CreateCustomerRequest
	if err := c.Bind(&req); err != nil {
		return apperror.ErrValidation("Format data tidak valid.")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	customer, err := h.svc.CreateCustomer(c.Request().Context(), merchantID, req)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, customer)
}
