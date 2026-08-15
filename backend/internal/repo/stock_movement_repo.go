package repo

import (
	"context"
	"warungku-backend/internal/model"

	"github.com/Masterminds/squirrel"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type StockMovementRepo struct {
	pool *pgxpool.Pool
}

func NewStockMovementRepo(pool *pgxpool.Pool) *StockMovementRepo {
	return &StockMovementRepo{pool: pool}
}

type FindMovementOptions struct {
	ProductID    *uuid.UUID
	MovementType *string
	Limit        int
}

func (r *StockMovementRepo) FindAll(ctx context.Context, merchantID uuid.UUID, opts FindMovementOptions) ([]model.StockMovement, error) {
	builder := squirrel.Select(
		"sm.id", "sm.product_id", "sm.supplier_id", "sm.type", "sm.quantity",
		"sm.qty_before", "sm.qty_after", "sm.unit_cost", "sm.reference_id",
		"sm.reference_type", "sm.notes", "sm.created_at",
		"p.name as product_name", "p.unit as product_unit", "p.sku as product_sku",
	).
		From("stock_movements sm").
		Join("products p ON p.id = sm.product_id").
		Where(squirrel.Eq{"p.merchant_id": merchantID}).
		OrderBy("sm.created_at DESC").
		PlaceholderFormat(squirrel.Dollar)

	if opts.ProductID != nil {
		builder = builder.Where(squirrel.Eq{"sm.product_id": *opts.ProductID})
	}
	if opts.MovementType != nil && *opts.MovementType != "" {
		builder = builder.Where(squirrel.Eq{"sm.type": *opts.MovementType})
	}

	limit := 100
	if opts.Limit > 0 {
		limit = opts.Limit
	}
	builder = builder.Limit(uint64(limit))

	sql, args, err := builder.ToSql()
	if err != nil {
		return nil, err
	}

	rows, err := r.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var movements []model.StockMovement
	for rows.Next() {
		var sm model.StockMovement
		var pName, pUnit string
		var pSKU *string

		err := rows.Scan(
			&sm.ID, &sm.ProductID, &sm.SupplierID, &sm.Type, &sm.Quantity,
			&sm.QtyBefore, &sm.QtyAfter, &sm.UnitCost, &sm.ReferenceID,
			&sm.ReferenceType, &sm.Notes, &sm.CreatedAt,
			&pName, &pUnit, &pSKU,
		)
		if err != nil {
			return nil, err
		}

		sm.Products = &model.StockMovementProductJoined{
			Name: pName,
			Unit: pUnit,
			SKU:  pSKU,
		}

		movements = append(movements, sm)
	}

	return movements, rows.Err()
}

func (r *StockMovementRepo) Create(ctx context.Context, sm *model.StockMovement) error {
	sql, args, err := squirrel.Insert("stock_movements").
		Columns(
			"product_id", "supplier_id", "type", "quantity",
			"qty_before", "qty_after", "unit_cost", "reference_id",
			"reference_type", "notes",
		).
		Values(
			sm.ProductID, sm.SupplierID, sm.Type, sm.Quantity,
			sm.QtyBefore, sm.QtyAfter, sm.UnitCost, sm.ReferenceID,
			sm.ReferenceType, sm.Notes,
		).
		Suffix("RETURNING id, created_at").
		PlaceholderFormat(squirrel.Dollar).
		ToSql()
	if err != nil {
		return err
	}

	return r.pool.QueryRow(ctx, sql, args...).Scan(&sm.ID, &sm.CreatedAt)
}
