package repo

import (
	"context"
	"time"
	"warungku-backend/internal/model"

	"github.com/Masterminds/squirrel"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CategoryRepo struct {
	pool *pgxpool.Pool
}

func NewCategoryRepo(pool *pgxpool.Pool) *CategoryRepo {
	return &CategoryRepo{pool: pool}
}

func (r *CategoryRepo) FindAllByMerchant(ctx context.Context, merchantID uuid.UUID) ([]model.Category, error) {
	sql, args, err := squirrel.Select("id", "merchant_id", "name", "color", "sort_order", "created_at").
		From("categories").
		Where(squirrel.Eq{"merchant_id": merchantID}).
		OrderBy("sort_order ASC", "name ASC").
		PlaceholderFormat(squirrel.Dollar).
		ToSql()
	if err != nil {
		return nil, err
	}

	rows, err := r.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []model.Category
	for rows.Next() {
		var c model.Category
		if err := rows.Scan(&c.ID, &c.MerchantID, &c.Name, &c.Color, &c.SortOrder, &c.CreatedAt); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}

	return categories, rows.Err()
}

func (r *CategoryRepo) FindByID(ctx context.Context, merchantID uuid.UUID, id uuid.UUID) (*model.Category, error) {
	sql, args, err := squirrel.Select("id", "merchant_id", "name", "color", "sort_order", "created_at").
		From("categories").
		Where(squirrel.Eq{"id": id, "merchant_id": merchantID}).
		PlaceholderFormat(squirrel.Dollar).
		ToSql()
	if err != nil {
		return nil, err
	}

	var c model.Category
	err = r.pool.QueryRow(ctx, sql, args...).Scan(&c.ID, &c.MerchantID, &c.Name, &c.Color, &c.SortOrder, &c.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &c, nil
}

func (r *CategoryRepo) Create(ctx context.Context, merchantID uuid.UUID, req model.CreateCategoryRequest) (*model.Category, error) {
	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}

	sql, args, err := squirrel.Insert("categories").
		Columns("merchant_id", "name", "color", "sort_order").
		Values(merchantID, req.Name, req.Color, sortOrder).
		Suffix("RETURNING id, merchant_id, name, color, sort_order, created_at").
		PlaceholderFormat(squirrel.Dollar).
		ToSql()
	if err != nil {
		return nil, err
	}

	var c model.Category
	err = r.pool.QueryRow(ctx, sql, args...).Scan(&c.ID, &c.MerchantID, &c.Name, &c.Color, &c.SortOrder, &c.CreatedAt)
	if err != nil {
		return nil, err
	}

	return &c, nil
}

func (r *CategoryRepo) Update(ctx context.Context, merchantID uuid.UUID, id uuid.UUID, req model.UpdateCategoryRequest) (*model.Category, error) {
	builder := squirrel.Update("categories").
		Where(squirrel.Eq{"id": id, "merchant_id": merchantID}).
		PlaceholderFormat(squirrel.Dollar)

	if req.Name != nil {
		builder = builder.Set("name", *req.Name)
	}
	if req.Color != nil {
		builder = builder.Set("color", req.Color)
	}
	if req.SortOrder != nil {
		builder = builder.Set("sort_order", *req.SortOrder)
	}

	sql, args, err := builder.Suffix("RETURNING id, merchant_id, name, color, sort_order, created_at").ToSql()
	if err != nil {
		return nil, err
	}

	var c model.Category
	err = r.pool.QueryRow(ctx, sql, args...).Scan(&c.ID, &c.MerchantID, &c.Name, &c.Color, &c.SortOrder, &c.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &c, nil
}

func (r *CategoryRepo) Delete(ctx context.Context, merchantID uuid.UUID, id uuid.UUID) (bool, error) {
	sql, args, err := squirrel.Delete("categories").
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

func (r *CategoryRepo) Ping(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return r.pool.Ping(ctx)
}
