package service

import (
	"context"
	"testing"
	"warungku-backend/internal/model"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestProductService_Validation(t *testing.T) {
	svc := NewProductService(nil, nil)
	ctx := context.Background()
	merchantID := uuid.New()

	t.Run("rejects empty product name", func(t *testing.T) {
		_, err := svc.CreateProduct(ctx, merchantID, model.CreateProductRequest{
			Name:      " ",
			SellPrice: 10000,
			BuyPrice:  5000,
			Unit:      "pcs",
		})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "minimal 2 karakter")
	})

	t.Run("rejects negative sell price", func(t *testing.T) {
		_, err := svc.CreateProduct(ctx, merchantID, model.CreateProductRequest{
			Name:      "Indomie Goreng",
			SellPrice: -1000,
			BuyPrice:  2500,
			Unit:      "pcs",
		})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Harga jual tidak boleh negatif")
	})

	t.Run("rejects negative buy price", func(t *testing.T) {
		_, err := svc.CreateProduct(ctx, merchantID, model.CreateProductRequest{
			Name:      "Indomie Goreng",
			SellPrice: 3500,
			BuyPrice:  -500,
			Unit:      "pcs",
		})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Harga beli tidak boleh negatif")
	})

	t.Run("rejects short product name on update", func(t *testing.T) {
		shortName := "x"
		_, err := svc.UpdateProduct(ctx, merchantID, uuid.New(), model.UpdateProductRequest{
			Name: &shortName,
		})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "minimal 2 karakter")
	})
}
