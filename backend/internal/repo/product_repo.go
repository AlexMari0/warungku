package repo

import (
	"context"
	"warungku-backend/internal/model"

	"github.com/Masterminds/squirrel"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProductRepo struct {
	pool *pgxpool.Pool
}

func NewProductRepo(pool *pgxpool.Pool) *ProductRepo {
	return &ProductRepo{pool: pool}
}

type FindProductOptions struct {
	ActiveOnly     bool
	OrderBy        string
	OrderAscending bool
}

func (r *ProductRepo) FindAllByMerchant(ctx context.Context, merchantID uuid.UUID, opts FindProductOptions) ([]model.Product, error) {
	builder := squirrel.Select(
		"p.id", "p.merchant_id", "p.category_id", "p.name", "p.sku", "p.barcode",
		"p.sell_price", "p.buy_price", "p.stock_qty", "p.min_stock", "p.unit",
		"p.image_url", "p.is_active", "p.created_at",
		"c.name as category_name", "c.color as category_color",
	).
		From("products p").
		LeftJoin("categories c ON c.id = p.category_id").
		Where(squirrel.Eq{"p.merchant_id": merchantID}).
		PlaceholderFormat(squirrel.Dollar)

	if opts.ActiveOnly {
		builder = builder.Where(squirrel.Eq{"p.is_active": true})
	}

	orderCol := "p.created_at"
	if opts.OrderBy == "name" {
		orderCol = "p.name"
	}
	orderDir := "DESC"
	if opts.OrderAscending {
		orderDir = "ASC"
	}
	builder = builder.OrderBy(orderCol + " " + orderDir)

	sql, args, err := builder.ToSql()
	if err != nil {
		return nil, err
	}

	rows, err := r.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []model.Product
	for rows.Next() {
		var p model.Product
		var catName *string
		var catColor *string

		err := rows.Scan(
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

		products = append(products, p)
	}

	return products, rows.Err()
}

func (r *ProductRepo) FindByID(ctx context.Context, merchantID uuid.UUID, id uuid.UUID) (*model.Product, error) {
	sql, args, err := squirrel.Select(
		"p.id", "p.merchant_id", "p.category_id", "p.name", "p.sku", "p.barcode",
		"p.sell_price", "p.buy_price", "p.stock_qty", "p.min_stock", "p.unit",
		"p.image_url", "p.is_active", "p.created_at",
		"c.name as category_name", "c.color as category_color",
	).
		From("products p").
		LeftJoin("categories c ON c.id = p.category_id").
		Where(squirrel.Eq{"p.id": id, "p.merchant_id": merchantID}).
		PlaceholderFormat(squirrel.Dollar).
		ToSql()
	if err != nil {
		return nil, err
	}

	var p model.Product
	var catName *string
	var catColor *string

	err = r.pool.QueryRow(ctx, sql, args...).Scan(
		&p.ID, &p.MerchantID, &p.CategoryID, &p.Name, &p.SKU, &p.Barcode,
		&p.SellPrice, &p.BuyPrice, &p.StockQty, &p.MinStock, &p.Unit,
		&p.ImageURL, &p.IsActive, &p.CreatedAt,
		&catName, &catColor,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	if catName != nil {
		p.Categories = &model.ProductCategoryJoined{
			Name:  *catName,
			Color: catColor,
		}
	}

	return &p, nil
}

func (r *ProductRepo) Create(ctx context.Context, merchantID uuid.UUID, req model.CreateProductRequest) (*model.Product, error) {
	var categoryID *uuid.UUID
	if req.CategoryID != nil && *req.CategoryID != "" {
		if parsed, err := uuid.Parse(*req.CategoryID); err == nil {
			categoryID = &parsed
		}
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	sql, args, err := squirrel.Insert("products").
		Columns(
			"merchant_id", "category_id", "name", "sku", "barcode",
			"sell_price", "buy_price", "stock_qty", "min_stock", "unit",
			"image_url", "is_active",
		).
		Values(
			merchantID, categoryID, req.Name, req.SKU, req.Barcode,
			req.SellPrice, req.BuyPrice, req.StockQty, req.MinStock, req.Unit,
			req.ImageURL, isActive,
		).
		Suffix("RETURNING id, merchant_id, category_id, name, sku, barcode, sell_price, buy_price, stock_qty, min_stock, unit, image_url, is_active, created_at").
		PlaceholderFormat(squirrel.Dollar).
		ToSql()
	if err != nil {
		return nil, err
	}

	var p model.Product
	err = r.pool.QueryRow(ctx, sql, args...).Scan(
		&p.ID, &p.MerchantID, &p.CategoryID, &p.Name, &p.SKU, &p.Barcode,
		&p.SellPrice, &p.BuyPrice, &p.StockQty, &p.MinStock, &p.Unit,
		&p.ImageURL, &p.IsActive, &p.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Fetch category info if category_id exists
	if p.CategoryID != nil {
		var catName string
		var catColor *string
		catErr := r.pool.QueryRow(ctx, "SELECT name, color FROM categories WHERE id = $1", *p.CategoryID).Scan(&catName, &catColor)
		if catErr == nil {
			p.Categories = &model.ProductCategoryJoined{
				Name:  catName,
				Color: catColor,
			}
		}
	}

	return &p, nil
}

func (r *ProductRepo) Update(ctx context.Context, merchantID uuid.UUID, id uuid.UUID, req model.UpdateProductRequest) (*model.Product, error) {
	builder := squirrel.Update("products").
		Where(squirrel.Eq{"id": id, "merchant_id": merchantID}).
		PlaceholderFormat(squirrel.Dollar)

	if req.Name != nil {
		builder = builder.Set("name", *req.Name)
	}
	if req.CategoryID != nil {
		if *req.CategoryID == "" {
			builder = builder.Set("category_id", nil)
		} else if parsed, err := uuid.Parse(*req.CategoryID); err == nil {
			builder = builder.Set("category_id", parsed)
		}
	}
	if req.SKU != nil {
		builder = builder.Set("sku", req.SKU)
	}
	if req.Barcode != nil {
		builder = builder.Set("barcode", req.Barcode)
	}
	if req.SellPrice != nil {
		builder = builder.Set("sell_price", *req.SellPrice)
	}
	if req.BuyPrice != nil {
		builder = builder.Set("buy_price", *req.BuyPrice)
	}
	if req.StockQty != nil {
		builder = builder.Set("stock_qty", *req.StockQty)
	}
	if req.MinStock != nil {
		builder = builder.Set("min_stock", *req.MinStock)
	}
	if req.Unit != nil {
		builder = builder.Set("unit", *req.Unit)
	}
	if req.ImageURL != nil {
		builder = builder.Set("image_url", req.ImageURL)
	}
	if req.IsActive != nil {
		builder = builder.Set("is_active", *req.IsActive)
	}

	sql, args, err := builder.
		Suffix("RETURNING id, merchant_id, category_id, name, sku, barcode, sell_price, buy_price, stock_qty, min_stock, unit, image_url, is_active, created_at").
		ToSql()
	if err != nil {
		return nil, err
	}

	var p model.Product
	err = r.pool.QueryRow(ctx, sql, args...).Scan(
		&p.ID, &p.MerchantID, &p.CategoryID, &p.Name, &p.SKU, &p.Barcode,
		&p.SellPrice, &p.BuyPrice, &p.StockQty, &p.MinStock, &p.Unit,
		&p.ImageURL, &p.IsActive, &p.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	if p.CategoryID != nil {
		var catName string
		var catColor *string
		catErr := r.pool.QueryRow(ctx, "SELECT name, color FROM categories WHERE id = $1", *p.CategoryID).Scan(&catName, &catColor)
		if catErr == nil {
			p.Categories = &model.ProductCategoryJoined{
				Name:  catName,
				Color: catColor,
			}
		}
	}

	return &p, nil
}

func (r *ProductRepo) Delete(ctx context.Context, merchantID uuid.UUID, id uuid.UUID) (bool, error) {
	sql, args, err := squirrel.Delete("products").
		Where(squirrel.Eq{"id": id, "merchant_id": merchantID}).
		PlaceholderFormat(squirrel.Dollar).
		ToSql()
	if err != nil {
		return false, err
	}

	cmd, err := r.pool.Exec(ctx, sql, args...)
	if err != nil {
		return false, err
	}

	return cmd.RowsAffected() > 0, nil
}

func (r *ProductRepo) ToggleActive(ctx context.Context, merchantID uuid.UUID, id uuid.UUID, isActive bool) (bool, error) {
	sql, args, err := squirrel.Update("products").
		Set("is_active", isActive).
		Where(squirrel.Eq{"id": id, "merchant_id": merchantID}).
		PlaceholderFormat(squirrel.Dollar).
		ToSql()
	if err != nil {
		return false, err
	}

	cmd, err := r.pool.Exec(ctx, sql, args...)
	if err != nil {
		return false, err
	}

	return cmd.RowsAffected() > 0, nil
}

func (r *ProductRepo) FetchSalesFrequency(ctx context.Context, merchantID uuid.UUID) (map[string]int, error) {
	sql := `
		SELECT oi.product_id, SUM(oi.quantity)::integer as total_qty
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		WHERE o.merchant_id = $1 AND o.status = 'paid'
		GROUP BY oi.product_id
	`

	rows, err := r.pool.Query(ctx, sql, merchantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	freq := make(map[string]int)
	for rows.Next() {
		var productID uuid.UUID
		var totalQty int
		if err := rows.Scan(&productID, &totalQty); err != nil {
			return nil, err
		}
		freq[productID.String()] = totalQty
	}

	return freq, rows.Err()
}
