package repo

import (
	"context"
	"fmt"
	"warungku-backend/internal/model"

	"github.com/Masterminds/squirrel"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type StorefrontRepo struct {
	pool *pgxpool.Pool
}

func NewStorefrontRepo(pool *pgxpool.Pool) *StorefrontRepo {
	return &StorefrontRepo{pool: pool}
}

func (r *StorefrontRepo) FindByMerchant(ctx context.Context, merchantID uuid.UUID) (*model.Storefront, error) {
	query := `
		SELECT id, merchant_id, slug, display_name, description, banner_url,
		       theme_color, is_published, custom_domain, created_at
		FROM storefronts
		WHERE merchant_id = $1
	`

	var s model.Storefront
	err := r.pool.QueryRow(ctx, query, merchantID).Scan(
		&s.ID, &s.MerchantID, &s.Slug, &s.DisplayName, &s.Description,
		&s.BannerURL, &s.ThemeColor, &s.IsPublished, &s.CustomDomain, &s.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &s, nil
}

func (r *StorefrontRepo) CreateDefault(ctx context.Context, merchantID uuid.UUID, slug, displayName string) (*model.Storefront, error) {
	bannerURL := "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80"
	description := "Selamat datang di toko online resmi kami!"
	themeColor := "emerald"

	query := `
		INSERT INTO storefronts (merchant_id, slug, display_name, description, banner_url, theme_color, is_published)
		VALUES ($1, $2, $3, $4, $5, $6, false)
		RETURNING id, merchant_id, slug, display_name, description, banner_url, theme_color, is_published, custom_domain, created_at
	`

	var s model.Storefront
	err := r.pool.QueryRow(ctx, query, merchantID, slug, displayName, description, bannerURL, themeColor).Scan(
		&s.ID, &s.MerchantID, &s.Slug, &s.DisplayName, &s.Description,
		&s.BannerURL, &s.ThemeColor, &s.IsPublished, &s.CustomDomain, &s.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &s, nil
}

func (r *StorefrontRepo) Update(ctx context.Context, merchantID uuid.UUID, req model.SaveStorefrontSettingsRequest) (*model.Storefront, error) {
	query := `
		UPDATE storefronts
		SET slug = $1, display_name = $2, description = $3, banner_url = $4,
		    theme_color = $5, is_published = $6
		WHERE merchant_id = $7
		RETURNING id, merchant_id, slug, display_name, description, banner_url, theme_color, is_published, custom_domain, created_at
	`

	var s model.Storefront
	err := r.pool.QueryRow(ctx, query,
		req.Slug, req.DisplayName, req.Description, req.BannerURL,
		req.ThemeColor, req.IsPublished, merchantID,
	).Scan(
		&s.ID, &s.MerchantID, &s.Slug, &s.DisplayName, &s.Description,
		&s.BannerURL, &s.ThemeColor, &s.IsPublished, &s.CustomDomain, &s.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &s, nil
}

func (r *StorefrontRepo) FindLinkedProducts(ctx context.Context, storefrontID uuid.UUID) ([]model.StorefrontProduct, error) {
	query := `
		SELECT id, storefront_id, product_id, is_featured, sort_order, custom_description
		FROM storefront_products
		WHERE storefront_id = $1
		ORDER BY is_featured DESC, sort_order ASC
	`

	rows, err := r.pool.Query(ctx, query, storefrontID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.StorefrontProduct
	for rows.Next() {
		var sp model.StorefrontProduct
		if err := rows.Scan(&sp.ID, &sp.StorefrontID, &sp.ProductID, &sp.IsFeatured, &sp.SortOrder, &sp.CustomDescription); err != nil {
			return nil, err
		}
		list = append(list, sp)
	}

	return list, rows.Err()
}

func (r *StorefrontRepo) SyncProducts(ctx context.Context, storefrontID uuid.UUID, productsMap map[string]model.StorefrontProductMapItem) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Delete existing linked products
	_, err = tx.Exec(ctx, "DELETE FROM storefront_products WHERE storefront_id = $1", storefrontID)
	if err != nil {
		return err
	}

	// Insert only linked products
	sortOrder := 0
	for productIDStr, item := range productsMap {
		if !item.IsLinked {
			continue
		}
		pID, parseErr := uuid.Parse(productIDStr)
		if parseErr != nil {
			continue
		}

		insertQuery := `
			INSERT INTO storefront_products (storefront_id, product_id, is_featured, sort_order, custom_description)
			VALUES ($1, $2, $3, $4, $5)
		`
		var customDesc *string
		if item.CustomDescription != "" {
			customDesc = &item.CustomDescription
		}

		_, err = tx.Exec(ctx, insertQuery, storefrontID, pID, item.IsFeatured, sortOrder, customDesc)
		if err != nil {
			return err
		}
		sortOrder++
	}

	return tx.Commit(ctx)
}

func (r *StorefrontRepo) CheckSlugAvailable(ctx context.Context, merchantID uuid.UUID, slug string) (bool, error) {
	query := "SELECT COUNT(*) FROM storefronts WHERE slug = $1 AND merchant_id != $2"
	var count int
	err := r.pool.QueryRow(ctx, query, slug, merchantID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count == 0, nil
}

func (r *StorefrontRepo) TrackEvent(ctx context.Context, slug, eventType string) error {
	_, err := r.pool.Exec(ctx, "SELECT public.track_storefront_event($1, $2)", slug, eventType)
	return err
}

func (r *StorefrontRepo) FindPublicBySlug(ctx context.Context, slug string) (*model.PublicStorefrontCatalog, error) {
	// 1. Fetch published storefront
	query := `
		SELECT id, merchant_id, slug, display_name, description, banner_url,
		       theme_color, is_published, custom_domain, created_at
		FROM storefronts
		WHERE slug = $1 AND is_published = true
	`

	var s model.Storefront
	err := r.pool.QueryRow(ctx, query, slug).Scan(
		&s.ID, &s.MerchantID, &s.Slug, &s.DisplayName, &s.Description,
		&s.BannerURL, &s.ThemeColor, &s.IsPublished, &s.CustomDomain, &s.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	// 2. Fetch categories for this merchant
	catRows, err := r.pool.Query(ctx, "SELECT id, merchant_id, name, color, sort_order, created_at FROM categories WHERE merchant_id = $1 ORDER BY sort_order ASC, name ASC", s.MerchantID)
	if err != nil {
		return nil, err
	}
	defer catRows.Close()

	var categories []model.Category
	for catRows.Next() {
		var c model.Category
		if err := catRows.Scan(&c.ID, &c.MerchantID, &c.Name, &c.Color, &c.SortOrder, &c.CreatedAt); err == nil {
			categories = append(categories, c)
		}
	}

	// 3. Fetch linked products
	spQuery := `
		SELECT sp.id, sp.storefront_id, sp.product_id, sp.is_featured, sp.sort_order, sp.custom_description,
		       p.id, p.merchant_id, p.category_id, p.name, p.sku, p.barcode,
		       p.sell_price, p.buy_price, p.stock_qty, p.min_stock, p.unit,
		       p.image_url, p.is_active, p.created_at,
		       c.name as cat_name, c.color as cat_color
		FROM storefront_products sp
		JOIN products p ON p.id = sp.product_id
		LEFT JOIN categories c ON c.id = p.category_id
		WHERE sp.storefront_id = $1 AND p.is_active = true
		ORDER BY sp.is_featured DESC, sp.sort_order ASC
	`

	spRows, err := r.pool.Query(ctx, spQuery, s.ID)
	if err != nil {
		return nil, err
	}
	defer spRows.Close()

	var featured []model.StorefrontProduct
	var catalog []model.StorefrontProduct

	for spRows.Next() {
		var sp model.StorefrontProduct
		var p model.Product
		var catName, catColor *string

		err := spRows.Scan(
			&sp.ID, &sp.StorefrontID, &sp.ProductID, &sp.IsFeatured, &sp.SortOrder, &sp.CustomDescription,
			&p.ID, &p.MerchantID, &p.CategoryID, &p.Name, &p.SKU, &p.Barcode,
			&p.SellPrice, &p.BuyPrice, &p.StockQty, &p.MinStock, &p.Unit,
			&p.ImageURL, &p.IsActive, &p.CreatedAt,
			&catName, &catColor,
		)
		if err != nil {
			return nil, err
		}

		if catName != nil {
			p.Categories = &model.ProductCategoryJoined{
				Name:  *catName,
				Color: catColor,
			}
		}
		sp.Products = &p

		catalog = append(catalog, sp)
		if sp.IsFeatured {
			featured = append(featured, sp)
		}
	}

	return &model.PublicStorefrontCatalog{
		Storefront:       s,
		Categories:       categories,
		FeaturedProducts: featured,
		Catalog:          catalog,
	}, nil
}

func (r *StorefrontRepo) CreateOnlineOrder(ctx context.Context, slug string, req model.CreateOnlineOrderRequest) (*model.OnlineOrder, error) {
	var sfID uuid.UUID
	err := r.pool.QueryRow(ctx, "SELECT id FROM storefronts WHERE slug = $1 AND is_published = true", slug).Scan(&sfID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("toko online tidak ditemukan atau belum dipublikasikan")
		}
		return nil, err
	}

	sql, args, err := squirrel.Insert("online_orders").
		Columns("storefront_id", "customer_name", "customer_phone", "status", "total_amount", "notes").
		Values(sfID, req.CustomerName, req.CustomerPhone, "pending", req.TotalAmount, req.Notes).
		Suffix("RETURNING id, storefront_id, customer_id, customer_name, customer_phone, status, total_amount, notes, wa_message_id, created_at").
		PlaceholderFormat(squirrel.Dollar).
		ToSql()
	if err != nil {
		return nil, err
	}

	var o model.OnlineOrder
	err = r.pool.QueryRow(ctx, sql, args...).Scan(
		&o.ID, &o.StorefrontID, &o.CustomerID, &o.CustomerName, &o.CustomerPhone,
		&o.Status, &o.TotalAmount, &o.Notes, &o.WAMessageID, &o.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &o, nil
}
