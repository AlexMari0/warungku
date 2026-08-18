package mockdata

import (
	"context"
	"fmt"
	"time"
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
	return 2
}

func (s *ScenarioWarungSukses) Up(ctx context.Context, svc *seedcore.Services) error {
	userID := uuid.New()
	_, err := svc.DB.Exec(ctx, `
		INSERT INTO auth.users (id, email, raw_user_meta_data)
		VALUES ($1, 'sukses@warungku.mock', '{"business_name": "Warung Berkah Jaya"}')
		ON CONFLICT (id) DO NOTHING
	`, userID)
	if err != nil {
		return fmt.Errorf("failed to insert mock auth user: %w", err)
	}

	var merchantID uuid.UUID
	err = svc.DB.QueryRow(ctx, `SELECT id FROM public.merchants WHERE user_id = $1`, userID).Scan(&merchantID)
	if err != nil {
		return fmt.Errorf("failed to fetch merchant ID for user: %w", err)
	}
	s.merchantID = merchantID

	// 1. Kategori Humanize
	categories := []model.CreateCategoryRequest{
		{Name: "Sembako", Color: ptr("#ef4444")},
		{Name: "Minuman", Color: ptr("#3b82f6")},
		{Name: "Jajanan", Color: ptr("#f59e0b")},
		{Name: "Keperluan Mandi", Color: ptr("#10b981")},
	}

	catMap := make(map[string]string)
	for _, req := range categories {
		c, err := svc.Category.CreateCategory(ctx, merchantID, req)
		if err != nil {
			return err
		}
		catMap[req.Name] = c.ID.String()
	}

	// 2. Produk Humanize
	products := []model.CreateProductRequest{
		{Name: "Beras Ramos 5kg", CategoryID: ptr(catMap["Sembako"]), SellPrice: 75000, BuyPrice: 70000, StockQty: 20, MinStock: 5, Unit: "karung"},
		{Name: "Minyak Goreng Bimoli 2L", CategoryID: ptr(catMap["Sembako"]), SellPrice: 35000, BuyPrice: 33000, StockQty: 30, MinStock: 10, Unit: "pouch"},
		{Name: "Indomie Goreng Spesial", CategoryID: ptr(catMap["Sembako"]), SellPrice: 3500, BuyPrice: 2800, StockQty: 120, MinStock: 40, Unit: "bungkus"},
		{Name: "Le Minerale 600ml", CategoryID: ptr(catMap["Minuman"]), SellPrice: 3500, BuyPrice: 2500, StockQty: 48, MinStock: 24, Unit: "botol"},
		{Name: "Teh Pucuk Harum 350ml", CategoryID: ptr(catMap["Minuman"]), SellPrice: 4000, BuyPrice: 3000, StockQty: 48, MinStock: 24, Unit: "botol"},
		{Name: "Kopi Kapal Api Mix", CategoryID: ptr(catMap["Minuman"]), SellPrice: 1500, BuyPrice: 1000, StockQty: 100, MinStock: 20, Unit: "sachet"},
		{Name: "Taro Net Seaweed", CategoryID: ptr(catMap["Jajanan"]), SellPrice: 5000, BuyPrice: 4000, StockQty: 50, MinStock: 10, Unit: "bungkus"},
		{Name: "Chitato Sapi Panggang", CategoryID: ptr(catMap["Jajanan"]), SellPrice: 6000, BuyPrice: 4500, StockQty: 40, MinStock: 10, Unit: "bungkus"},
		{Name: "Sabun Mandi Nuvo", CategoryID: ptr(catMap["Keperluan Mandi"]), SellPrice: 4000, BuyPrice: 3000, StockQty: 36, MinStock: 12, Unit: "pcs"},
		{Name: "Shampo Clear Men", CategoryID: ptr(catMap["Keperluan Mandi"]), SellPrice: 1000, BuyPrice: 700, StockQty: 120, MinStock: 24, Unit: "sachet"},
	}

	prodMap := make(map[string]uuid.UUID)
	for _, req := range products {
		p, err := svc.Product.CreateProduct(ctx, merchantID, req)
		if err != nil {
			return err
		}
		prodMap[req.Name] = p.ID
	}

	// 3. Pelanggan Humanize
	cust1, _ := svc.Customer.CreateCustomer(ctx, merchantID, model.CreateCustomerRequest{Name: "Ibu Siti", Phone: ptr("081234567890")})
	cust2, _ := svc.Customer.CreateCustomer(ctx, merchantID, model.CreateCustomerRequest{Name: "Pak Budi", Phone: ptr("081987654321")})

	// 4. Simulasi Transaksi (Checkout) agar dashboard tidak kosong
	paidAmount1 := 75000.0
	cust1ID := cust1.ID.String()
	_, _ = svc.Checkout.ProcessCheckout(ctx, merchantID, model.CheckoutRequest{
		Items: []model.CheckoutItemRequest{
			{ProductID: prodMap["Beras Ramos 5kg"], Quantity: 1, Discount: 0},
		},
		PaymentMethod: "cash",
		PaidAmount:    &paidAmount1,
		CustomerID:    &cust1ID,
	})

	paidAmount2 := 16000.0
	_, _ = svc.Checkout.ProcessCheckout(ctx, merchantID, model.CheckoutRequest{
		Items: []model.CheckoutItemRequest{
			{ProductID: prodMap["Indomie Goreng Spesial"], Quantity: 2, Discount: 0},
			{ProductID: prodMap["Teh Pucuk Harum 350ml"], Quantity: 1, Discount: 0},
			{ProductID: prodMap["Taro Net Seaweed"], Quantity: 1, Discount: 0},
		},
		PaymentMethod: "qris",
		PaidAmount:    &paidAmount2,
		CustomerID:    nil,
	})

	paidAmount3 := 40000.0
	cust2ID := cust2.ID.String()
	_, _ = svc.Checkout.ProcessCheckout(ctx, merchantID, model.CheckoutRequest{
		Items: []model.CheckoutItemRequest{
			{ProductID: prodMap["Minyak Goreng Bimoli 2L"], Quantity: 1, Discount: 0},
			{ProductID: prodMap["Kopi Kapal Api Mix"], Quantity: 5, Discount: 0},
		},
		PaymentMethod: "cash",
		PaidAmount:    &paidAmount3,
		CustomerID:    &cust2ID,
	})

	// 5. Jalankan Analytics Refresh untuk mengkalkulasi transaksi di atas ke dashboard
	_ = svc.Report.RefreshAnalytics(ctx, merchantID, time.Now().Format("2006-01-02"))

	return nil
}

func (s *ScenarioWarungSukses) Down(ctx context.Context, svc *seedcore.Services) error {
	if s.merchantID == uuid.Nil {
		_ = svc.DB.QueryRow(ctx, `SELECT id FROM public.merchants JOIN auth.users u ON u.id = user_id WHERE u.email = 'sukses@warungku.mock'`).Scan(&s.merchantID)
	}

	if s.merchantID != uuid.Nil {
		_, _ = svc.DB.Exec(ctx, `DELETE FROM public.payments WHERE order_id IN (SELECT id FROM public.orders WHERE merchant_id = $1)`, s.merchantID)
		_, _ = svc.DB.Exec(ctx, `DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE merchant_id = $1)`, s.merchantID)
		_, _ = svc.DB.Exec(ctx, `DELETE FROM public.orders WHERE merchant_id = $1`, s.merchantID)
		_, _ = svc.DB.Exec(ctx, `DELETE FROM public.stock_movements WHERE product_id IN (SELECT id FROM public.products WHERE merchant_id = $1)`, s.merchantID)
		_, _ = svc.DB.Exec(ctx, `DELETE FROM public.products WHERE merchant_id = $1`, s.merchantID)
		_, _ = svc.DB.Exec(ctx, `DELETE FROM public.categories WHERE merchant_id = $1`, s.merchantID)
		_, _ = svc.DB.Exec(ctx, `DELETE FROM public.customers WHERE merchant_id = $1`, s.merchantID)
	}

	_, _ = svc.DB.Exec(ctx, `DELETE FROM public.seed_data_migrations WHERE name = 'warung_sukses'`)
	_, err := svc.DB.Exec(ctx, `DELETE FROM auth.users WHERE email = 'sukses@warungku.mock'`)
	return err
}

func ptr(s string) *string {
	return &s
}
