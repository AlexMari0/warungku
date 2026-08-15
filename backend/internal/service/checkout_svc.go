package service

import (
	"context"
	"warungku-backend/internal/apperror"
	"warungku-backend/internal/model"
	"warungku-backend/internal/repo"

	"github.com/google/uuid"
)

type CheckoutService struct {
	orderRepo *repo.OrderRepo
}

func NewCheckoutService(orderRepo *repo.OrderRepo) *CheckoutService {
	return &CheckoutService{orderRepo: orderRepo}
}

func (s *CheckoutService) ProcessCheckout(ctx context.Context, merchantID uuid.UUID, req model.CheckoutRequest) (*model.CheckoutResult, error) {
	if len(req.Items) == 0 {
		return nil, apperror.ErrValidation("Keranjang belanja tidak boleh kosong.")
	}

	for _, item := range req.Items {
		if item.Quantity <= 0 {
			return nil, apperror.ErrValidation("Kuantitas produk harus lebih besar dari 0.")
		}
	}

	result, err := s.orderRepo.ExecuteAtomicCheckout(ctx, merchantID, req)
	if err != nil {
		return nil, s.orderRepo.MapPostgresError(err)
	}

	return result, nil
}

func (s *CheckoutService) GetRecentOrders(ctx context.Context, merchantID uuid.UUID, limit int) ([]model.Order, error) {
	return s.orderRepo.FindRecentOrders(ctx, merchantID, limit)
}
