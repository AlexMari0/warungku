package service

import (
	"context"
	"strings"
	"warungku-backend/internal/apperror"
	"warungku-backend/internal/model"
	"warungku-backend/internal/repo"

	"github.com/google/uuid"
)

type CategoryService struct {
	repo *repo.CategoryRepo
}

func NewCategoryService(repo *repo.CategoryRepo) *CategoryService {
	return &CategoryService{repo: repo}
}

func (s *CategoryService) ListCategories(ctx context.Context, merchantID uuid.UUID) ([]model.Category, error) {
	return s.repo.FindAllByMerchant(ctx, merchantID)
}

func (s *CategoryService) CreateCategory(ctx context.Context, merchantID uuid.UUID, req model.CreateCategoryRequest) (*model.Category, error) {
	req.Name = strings.TrimSpace(req.Name)
	if len(req.Name) < 2 {
		return nil, apperror.ErrValidation("Nama kategori minimal 2 karakter.")
	}

	return s.repo.Create(ctx, merchantID, req)
}

func (s *CategoryService) UpdateCategory(ctx context.Context, merchantID, id uuid.UUID, req model.UpdateCategoryRequest) (*model.Category, error) {
	if req.Name != nil {
		clean := strings.TrimSpace(*req.Name)
		if len(clean) < 2 {
			return nil, apperror.ErrValidation("Nama kategori minimal 2 karakter.")
		}
		req.Name = &clean
	}

	category, err := s.repo.Update(ctx, merchantID, id, req)
	if err != nil {
		return nil, err
	}
	if category == nil {
		return nil, apperror.ErrNotFound("Kategori")
	}

	return category, nil
}

func (s *CategoryService) DeleteCategory(ctx context.Context, merchantID, id uuid.UUID) error {
	deleted, err := s.repo.Delete(ctx, merchantID, id)
	if err != nil {
		return err
	}
	if !deleted {
		return apperror.ErrNotFound("Kategori")
	}
	return nil
}
