package service

import (
	"context"
	"testing"
	"warungku-backend/internal/model"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestCheckoutService_Validation(t *testing.T) {
	svc := NewCheckoutService(nil)
	ctx := context.Background()
	merchantID := uuid.New()

	t.Run("rejects empty cart", func(t *testing.T) {
		_, err := svc.ProcessCheckout(ctx, merchantID, model.CheckoutRequest{
			Items:         []model.CheckoutItemRequest{},
			PaymentMethod: "cash",
		})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "tidak boleh kosong")
	})

	t.Run("rejects non-positive quantity", func(t *testing.T) {
		_, err := svc.ProcessCheckout(ctx, merchantID, model.CheckoutRequest{
			Items: []model.CheckoutItemRequest{
				{
					ProductID: uuid.New(),
					Quantity:  0,
					Discount:  0,
				},
			},
			PaymentMethod: "cash",
		})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "lebih besar dari 0")
	})
}
