package repo

import (
	"context"
	"warungku-backend/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PaymentRepo struct {
	pool *pgxpool.Pool
}

func NewPaymentRepo(pool *pgxpool.Pool) *PaymentRepo {
	return &PaymentRepo{pool: pool}
}

func (r *PaymentRepo) FindByOrderID(ctx context.Context, orderID uuid.UUID) (*model.Payment, error) {
	query := `
		SELECT id, order_id, method, amount, change_amount, reference_number, status, paid_at
		FROM payments
		WHERE order_id = $1
	`

	var p model.Payment
	err := r.pool.QueryRow(ctx, query, orderID).Scan(
		&p.ID, &p.OrderID, &p.Method, &p.Amount, &p.ChangeAmount,
		&p.ReferenceNumber, &p.Status, &p.PaidAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &p, nil
}
