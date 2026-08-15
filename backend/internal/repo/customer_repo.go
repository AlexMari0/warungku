package repo

import (
	"context"
	"warungku-backend/internal/model"

	"github.com/Masterminds/squirrel"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CustomerRepo struct {
	pool *pgxpool.Pool
}

func NewCustomerRepo(pool *pgxpool.Pool) *CustomerRepo {
	return &CustomerRepo{pool: pool}
}

func (r *CustomerRepo) FindAllByMerchant(ctx context.Context, merchantID uuid.UUID) ([]model.Customer, error) {
	sql, args, err := squirrel.Select("id", "merchant_id", "name", "phone", "total_debt", "loyalty_points", "created_at").
		From("customers").
		Where(squirrel.Eq{"merchant_id": merchantID}).
		OrderBy("name ASC").
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

	var customers []model.Customer
	for rows.Next() {
		var c model.Customer
		if err := rows.Scan(&c.ID, &c.MerchantID, &c.Name, &c.Phone, &c.TotalDebt, &c.LoyaltyPoints, &c.CreatedAt); err != nil {
			return nil, err
		}
		customers = append(customers, c)
	}

	return customers, rows.Err()
}

func (r *CustomerRepo) FindByID(ctx context.Context, merchantID uuid.UUID, id uuid.UUID) (*model.Customer, error) {
	sql, args, err := squirrel.Select("id", "merchant_id", "name", "phone", "total_debt", "loyalty_points", "created_at").
		From("customers").
		Where(squirrel.Eq{"id": id, "merchant_id": merchantID}).
		PlaceholderFormat(squirrel.Dollar).
		ToSql()
	if err != nil {
		return nil, err
	}

	var c model.Customer
	err = r.pool.QueryRow(ctx, sql, args...).Scan(&c.ID, &c.MerchantID, &c.Name, &c.Phone, &c.TotalDebt, &c.LoyaltyPoints, &c.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &c, nil
}

func (r *CustomerRepo) Create(ctx context.Context, merchantID uuid.UUID, req model.CreateCustomerRequest) (*model.Customer, error) {
	sql, args, err := squirrel.Insert("customers").
		Columns("merchant_id", "name", "phone").
		Values(merchantID, req.Name, req.Phone).
		Suffix("RETURNING id, merchant_id, name, phone, total_debt, loyalty_points, created_at").
		PlaceholderFormat(squirrel.Dollar).
		ToSql()
	if err != nil {
		return nil, err
	}

	var c model.Customer
	err = r.pool.QueryRow(ctx, sql, args...).Scan(&c.ID, &c.MerchantID, &c.Name, &c.Phone, &c.TotalDebt, &c.LoyaltyPoints, &c.CreatedAt)
	if err != nil {
		return nil, err
	}

	return &c, nil
}
