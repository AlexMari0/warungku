package mockdata

import (
	"context"
	"fmt"
	"warungku-backend/internal/model"
	"warungku-backend/internal/seedcore"

	"github.com/google/uuid"
)

type ScenarioWarungSukses struct {
	merchantID uuid.UUID
}

func (s *ScenarioWarungSukses) Name() string {
	return "warung_sukses"
}

func (s *ScenarioWarungSukses) Group() string {
	return "scenario_warung_sukses"
}

func (s *ScenarioWarungSukses) Version() int {
	return 1
}

func (s *ScenarioWarungSukses) Up(ctx context.Context, svc *seedcore.Services) error {
	// 1. Bypass RLS and create a mock user in auth.users
	// Supabase trigger will automatically create a merchant row
	userID := uuid.New()
	_, err := svc.DB.Exec(ctx, `
		INSERT INTO auth.users (id, email, raw_user_meta_data)
		VALUES ($1, 'sukses@warungku.mock', '{"business_name": "Warung Sukses"}')
		ON CONFLICT (id) DO NOTHING
	`, userID)
	if err != nil {
		return fmt.Errorf("failed to insert mock auth user: %w", err)
	}

	// Fetch the generated merchant ID
	var merchantID uuid.UUID
	err = svc.DB.QueryRow(ctx, `SELECT id FROM public.merchants WHERE user_id = $1`, userID).Scan(&merchantID)
	if err != nil {
		return fmt.Errorf("failed to fetch merchant ID for user: %w", err)
	}
	s.merchantID = merchantID

	// 2. Create Categories via Service
	catReq1 := model.CreateCategoryRequest{Name: "Makanan Ringan", Color: ptr("#ff9900")}
	cat1, err := svc.Category.CreateCategory(ctx, merchantID, catReq1)
	if err != nil {
		return err
	}

	catReq2 := model.CreateCategoryRequest{Name: "Minuman", Color: ptr("#0099ff")}
	cat2, err := svc.Category.CreateCategory(ctx, merchantID, catReq2)
	if err != nil {
		return err
	}

	// 3. Create Products via Service
	cat1IDStr := cat1.ID.String()
	prodReq1 := model.CreateProductRequest{
		Name:       "Chitato Sapi Panggang",
		CategoryID: &cat1IDStr,
		SellPrice:  6000,
		BuyPrice:   4500,
		StockQty:   100,
		MinStock:   10,
		Unit:       "pcs",
	}
	if _, err := svc.Product.CreateProduct(ctx, merchantID, prodReq1); err != nil {
		return err
	}

	cat2IDStr := cat2.ID.String()
	prodReq2 := model.CreateProductRequest{
		Name:       "Aqua Botol 600ml",
		CategoryID: &cat2IDStr,
		SellPrice:  3500,
		BuyPrice:   2000,
		StockQty:   200,
		MinStock:   24,
		Unit:       "btl",
	}
	if _, err := svc.Product.CreateProduct(ctx, merchantID, prodReq2); err != nil {
		return err
	}

	// For checkout or further complex logic, we can call svc.Checkout...
	return nil
}

func (s *ScenarioWarungSukses) Down(ctx context.Context, svc *seedcore.Services) error {
	// Cleanup happens directly in DB via merchant_id cascade (or we can just delete the user)
	if s.merchantID == uuid.Nil {
		// Attempt to resolve merchant ID if object was just initialized
		_ = svc.DB.QueryRow(ctx, `SELECT id FROM public.merchants JOIN auth.users u ON u.id = user_id WHERE u.email = 'sukses@warungku.mock'`).Scan(&s.merchantID)
	}

	_, err := svc.DB.Exec(ctx, `DELETE FROM auth.users WHERE email = 'sukses@warungku.mock'`)
	return err
}

func ptr(s string) *string {
	return &s
}
