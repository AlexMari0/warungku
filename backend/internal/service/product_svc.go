package service

import (
	"context"
	"strings"
	"sync"
	"time"
	"warungku-backend/internal/apperror"
	"warungku-backend/internal/model"
	"warungku-backend/internal/repo"

	"github.com/google/uuid"
)

type salesFreqCacheItem struct {
	Data      map[string]int
	ExpiresAt time.Time
}

type ProductService struct {
	productRepo       repo.IProductRepo
	stockMovementRepo repo.IStockMovementRepo

	salesFreqCache map[uuid.UUID]salesFreqCacheItem
	salesFreqMu    sync.RWMutex
}

func NewProductService(productRepo repo.IProductRepo, stockMovementRepo repo.IStockMovementRepo) *ProductService {
	return &ProductService{
		productRepo:       productRepo,
		stockMovementRepo: stockMovementRepo,
		salesFreqCache:    make(map[uuid.UUID]salesFreqCacheItem),
	}
}

func (s *ProductService) ListProducts(ctx context.Context, merchantID uuid.UUID, opts repo.FindProductOptions) ([]model.Product, error) {
	return s.productRepo.FindAllByMerchant(ctx, merchantID, opts)
}

func (s *ProductService) GetProduct(ctx context.Context, merchantID, id uuid.UUID) (*model.Product, error) {
	p, err := s.productRepo.FindByID(ctx, merchantID, id)
	if err != nil {
		return nil, err
	}
	if p == nil {
		return nil, apperror.ErrNotFound("Produk")
	}
	return p, nil
}

func (s *ProductService) CreateProduct(ctx context.Context, merchantID uuid.UUID, req model.CreateProductRequest) (*model.Product, error) {
	req.Name = strings.TrimSpace(req.Name)
	if len(req.Name) < 2 {
		return nil, apperror.ErrValidation("Nama produk minimal 2 karakter.")
	}
	if req.SellPrice < 0 {
		return nil, apperror.ErrValidation("Harga jual tidak boleh negatif.")
	}
	if req.BuyPrice < 0 {
		return nil, apperror.ErrValidation("Harga beli tidak boleh negatif.")
	}

	product, err := s.productRepo.Create(ctx, merchantID, req)
	if err != nil {
		return nil, err
	}

	// Log initial stock movement if stock_qty > 0
	if req.StockQty > 0 {
		unitCost := req.BuyPrice
		notes := "Stok awal produk baru"
		refType := "adjustment"
		_ = s.stockMovementRepo.Create(ctx, &model.StockMovement{
			ProductID:     product.ID,
			Type:          "adjustment",
			Quantity:      req.StockQty,
			QtyBefore:     0,
			QtyAfter:      req.StockQty,
			UnitCost:      &unitCost,
			ReferenceType: &refType,
			Notes:         &notes,
		})
	}

	return product, nil
}

func (s *ProductService) UpdateProduct(ctx context.Context, merchantID, id uuid.UUID, req model.UpdateProductRequest) (*model.Product, error) {
	if req.Name != nil {
		clean := strings.TrimSpace(*req.Name)
		if len(clean) < 2 {
			return nil, apperror.ErrValidation("Nama produk minimal 2 karakter.")
		}
		req.Name = &clean
	}

	product, err := s.productRepo.Update(ctx, merchantID, id, req)
	if err != nil {
		return nil, err
	}
	if product == nil {
		return nil, apperror.ErrNotFound("Produk")
	}

	return product, nil
}

func (s *ProductService) DeleteProduct(ctx context.Context, merchantID, id uuid.UUID) error {
	deleted, err := s.productRepo.Delete(ctx, merchantID, id)
	if err != nil {
		return err
	}
	if !deleted {
		return apperror.ErrNotFound("Produk")
	}
	return nil
}

func (s *ProductService) ToggleActive(ctx context.Context, merchantID, id uuid.UUID, isActive bool) error {
	updated, err := s.productRepo.ToggleActive(ctx, merchantID, id, isActive)
	if err != nil {
		return err
	}
	if !updated {
		return apperror.ErrNotFound("Produk")
	}
	return nil
}

func (s *ProductService) FetchSalesFrequency(ctx context.Context, merchantID uuid.UUID) (map[string]int, error) {
	// 1. Cek Cache
	s.salesFreqMu.RLock()
	item, exists := s.salesFreqCache[merchantID]
	s.salesFreqMu.RUnlock()

	if exists && time.Now().Before(item.ExpiresAt) {
		return item.Data, nil
	}

	// 2. Jika Cache Expired/Tidak Ada, Ambil dari DB
	freq, err := s.productRepo.FetchSalesFrequency(ctx, merchantID)
	if err != nil {
		return nil, err
	}

	// 3. Simpan di Cache (TTL: 2 Menit)
	s.salesFreqMu.Lock()
	s.salesFreqCache[merchantID] = salesFreqCacheItem{
		Data:      freq,
		ExpiresAt: time.Now().Add(2 * time.Minute),
	}
	s.salesFreqMu.Unlock()

	return freq, nil
}
