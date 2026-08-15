package service

import (
	"context"
	"testing"
	"warungku-backend/internal/model"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestStorefrontService_Validation(t *testing.T) {
	svc := NewStorefrontService(nil, nil)
	ctx := context.Background()
	merchantID := uuid.New()

	t.Run("rejects invalid slug format", func(t *testing.T) {
		_, err := svc.SaveSettings(ctx, merchantID, model.SaveStorefrontSettingsRequest{
			Slug:        "Toko Keren!! #1",
			DisplayName: "Toko Keren",
			ThemeColor:  "emerald",
		})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Slug toko hanya boleh")
	})

	t.Run("rejects check-slug with invalid characters", func(t *testing.T) {
		_, err := svc.CheckSlug(ctx, merchantID, "invalid slug with spaces")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Format slug tidak valid")
	})
}
