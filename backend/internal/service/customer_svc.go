package service

import (
	"context"
	"strings"
	"warungku-backend/internal/apperror"
	"warungku-backend/internal/model"
	"warungku-backend/internal/repo"

	"github.com/google/uuid"
)

type CustomerService struct {
	repo repo.ICustomerRepo
}

func NewCustomerService(repo repo.ICustomerRepo) *CustomerService {
	return &CustomerService{repo: repo}
}

func (s *CustomerService) ListCustomers(ctx context.Context, merchantID uuid.UUID) ([]model.Customer, error) {
	return s.repo.FindAllByMerchant(ctx, merchantID)
}

func (s *CustomerService) CreateCustomer(ctx context.Context, merchantID uuid.UUID, req model.CreateCustomerRequest) (*model.Customer, error) {
	req.Name = strings.TrimSpace(req.Name)
	if len(req.Name) < 2 {
		return nil, apperror.ErrValidation("Nama pelanggan minimal 2 karakter.")
	}

	return s.repo.Create(ctx, merchantID, req)
}
