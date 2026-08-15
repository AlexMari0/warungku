package service

import (
	"context"
	"testing"
	"warungku-backend/internal/model"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestCategoryService_Validation(t *testing.T) {
	svc := NewCategoryService(nil)
	ctx := context.Background()
	merchantID := uuid.New()

	t.Run("rejects empty name", func(t *testing.T) {
		_, err := svc.CreateCategory(ctx, merchantID, model.CreateCategoryRequest{
			Name: " ",
		})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "minimal 2 karakter")
	})

	t.Run("rejects short name on update", func(t *testing.T) {
		shortName := "a"
		_, err := svc.UpdateCategory(ctx, merchantID, uuid.New(), model.UpdateCategoryRequest{
			Name: &shortName,
		})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "minimal 2 karakter")
	})
}
