package service

import (
	"context"
	"fmt"
	"math/rand"
	"regexp"
	"strings"
	"warungku-backend/internal/apperror"
	"warungku-backend/internal/model"
	"warungku-backend/internal/repo"

	"github.com/google/uuid"
)

var slugRegex = regexp.MustCompile(`^[a-z0-9-_]+$`)

type StorefrontService struct {
	storefrontRepo repo.IStorefrontRepo
	productRepo    repo.IProductRepo
}

func NewStorefrontService(storefrontRepo repo.IStorefrontRepo, productRepo repo.IProductRepo) *StorefrontService {
	return &StorefrontService{
		storefrontRepo: storefrontRepo,
		productRepo:    productRepo,
	}
}

func (s *StorefrontService) GetSettings(ctx context.Context, merchantID uuid.UUID, userEmail string) (*model.StorefrontSettingsResponse, error) {
	sf, err := s.storefrontRepo.FindByMerchant(ctx, merchantID)
	if err != nil {
		return nil, err
	}

	// Auto-create default storefront if not exists
	if sf == nil {
		namePart := "toko-saya"
		if userEmail != "" && strings.Contains(userEmail, "@") {
			namePart = strings.Split(userEmail, "@")[0]
		}
		cleanName := strings.ToLower(regexp.MustCompile(`[^a-z0-9]`).ReplaceAllString(namePart, "-"))
		defaultSlug := fmt.Sprintf("%s-%d", cleanName, 100+rand.Intn(900))
		defaultName := "Toko Baru Saya"

		sf, err = s.storefrontRepo.CreateDefault(ctx, merchantID, defaultSlug, defaultName)
		if err != nil {
			return nil, err
		}
	}

	// Fetch all merchant products
	allProducts, err := s.productRepo.FindAllByMerchant(ctx, merchantID, repo.FindProductOptions{})
	if err != nil {
		return nil, err
	}

	// Fetch linked storefront products
	linked, err := s.storefrontRepo.FindLinkedProducts(ctx, sf.ID)
	if err != nil {
		return nil, err
	}

	linkedMap := make(map[uuid.UUID]model.StorefrontProduct)
	for _, lp := range linked {
		linkedMap[lp.ProductID] = lp
	}

	productsMap := make(map[string]model.StorefrontProductMapItem)
	for _, p := range allProducts {
		pIDStr := p.ID.String()
		if lp, ok := linkedMap[p.ID]; ok {
			desc := ""
			if lp.CustomDescription != nil {
				desc = *lp.CustomDescription
			}
			productsMap[pIDStr] = model.StorefrontProductMapItem{
				IsLinked:          true,
				IsFeatured:        lp.IsFeatured,
				CustomDescription: desc,
			}
		} else {
			productsMap[pIDStr] = model.StorefrontProductMapItem{
				IsLinked:          false,
				IsFeatured:        false,
				CustomDescription: "",
			}
		}
	}

	return &model.StorefrontSettingsResponse{
		Storefront:            *sf,
		StorefrontProductsMap: productsMap,
	}, nil
}

func (s *StorefrontService) SaveSettings(ctx context.Context, merchantID uuid.UUID, req model.SaveStorefrontSettingsRequest) (*model.StorefrontSettingsResponse, error) {
	cleanSlug := strings.ToLower(strings.TrimSpace(req.Slug))
	if cleanSlug == "" || !slugRegex.MatchString(cleanSlug) {
		return nil, apperror.ErrValidation("Slug toko hanya boleh berisi huruf kecil, angka, strip (-), dan garis bawah (_).")
	}
	req.Slug = cleanSlug

	// Check slug availability
	available, err := s.storefrontRepo.CheckSlugAvailable(ctx, merchantID, req.Slug)
	if err != nil {
		return nil, err
	}
	if !available {
		return nil, apperror.ErrConflict("Slug toko ini sudah digunakan oleh warung lain. Silakan pilih slug yang berbeda.")
	}

	// Update settings
	sf, err := s.storefrontRepo.Update(ctx, merchantID, req)
	if err != nil {
		return nil, err
	}

	// Synchronize product links
	if req.StorefrontProductsMap != nil {
		err = s.storefrontRepo.SyncProducts(ctx, sf.ID, req.StorefrontProductsMap)
		if err != nil {
			return nil, err
		}
	}

	return &model.StorefrontSettingsResponse{
		Storefront:            *sf,
		StorefrontProductsMap: req.StorefrontProductsMap,
	}, nil
}

func (s *StorefrontService) CheckSlug(ctx context.Context, merchantID uuid.UUID, slug string) (bool, error) {
	cleanSlug := strings.ToLower(strings.TrimSpace(slug))
	if cleanSlug == "" || !slugRegex.MatchString(cleanSlug) {
		return false, apperror.ErrValidation("Format slug tidak valid.")
	}
	return s.storefrontRepo.CheckSlugAvailable(ctx, merchantID, cleanSlug)
}

func (s *StorefrontService) GetPublicCatalog(ctx context.Context, slug string) (*model.PublicStorefrontCatalog, error) {
	cleanSlug := strings.ToLower(strings.TrimSpace(slug))
	catalog, err := s.storefrontRepo.FindPublicBySlug(ctx, cleanSlug)
	if err != nil {
		return nil, err
	}
	if catalog == nil {
		return nil, apperror.ErrNotFound("Toko online")
	}
	return catalog, nil
}

func (s *StorefrontService) TrackEvent(ctx context.Context, slug, eventType string) error {
	cleanSlug := strings.ToLower(strings.TrimSpace(slug))
	return s.storefrontRepo.TrackEvent(ctx, cleanSlug, eventType)
}

func (s *StorefrontService) CreateOnlineOrder(ctx context.Context, slug string, req model.CreateOnlineOrderRequest) (*model.OnlineOrder, error) {
	cleanSlug := strings.ToLower(strings.TrimSpace(slug))
	return s.storefrontRepo.CreateOnlineOrder(ctx, cleanSlug, req)
}
