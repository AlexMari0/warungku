package service

import (
	"context"
	"warungku-backend/internal/apperror"
	"warungku-backend/internal/model"
	"warungku-backend/internal/repo"

	"github.com/google/uuid"
)

type StockMovementService struct {
	movementRepo *repo.StockMovementRepo
	productRepo  *repo.ProductRepo
}

func NewStockMovementService(movementRepo *repo.StockMovementRepo, productRepo *repo.ProductRepo) *StockMovementService {
	return &StockMovementService{
		movementRepo: movementRepo,
		productRepo:  productRepo,
	}
}

func (s *StockMovementService) ListMovements(ctx context.Context, merchantID uuid.UUID, opts repo.FindMovementOptions) ([]model.StockMovement, error) {
	return s.movementRepo.FindAll(ctx, merchantID, opts)
}

func (s *StockMovementService) CreateMovement(ctx context.Context, merchantID uuid.UUID, req model.CreateStockMovementRequest) (*model.StockMovement, error) {
	// 1. Verify product belongs to merchant
	p, err := s.productRepo.FindByID(ctx, merchantID, req.ProductID)
	if err != nil {
		return nil, err
	}
	if p == nil {
		return nil, apperror.ErrNotFound("Produk")
	}

	qtyBefore := p.StockQty
	qtyAfter := qtyBefore + req.Quantity

	if qtyAfter < 0 {
		return nil, apperror.ErrValidation("Penyesuaian stok akan mengakibatkan stok negatif.")
	}

	// 2. Update product stock quantity
	_, err = s.productRepo.Update(ctx, merchantID, p.ID, model.UpdateProductRequest{
		StockQty: &qtyAfter,
	})
	if err != nil {
		return nil, err
	}

	// 3. Log movement
	refType := "adjustment"
	movement := &model.StockMovement{
		ProductID:     p.ID,
		Type:          req.Type,
		Quantity:      req.Quantity,
		QtyBefore:     qtyBefore,
		QtyAfter:      qtyAfter,
		UnitCost:      req.UnitCost,
		ReferenceType: &refType,
		Notes:         req.Notes,
	}

	if err := s.movementRepo.Create(ctx, movement); err != nil {
		return nil, err
	}

	movement.Products = &model.StockMovementProductJoined{
		Name: p.Name,
		Unit: p.Unit,
		SKU:  p.SKU,
	}

	return movement, nil
}
