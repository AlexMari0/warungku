package repo

import (
	"context"
	"encoding/json"
	"fmt"
	"warungku-backend/internal/apperror"
	"warungku-backend/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OrderRepo struct {
	pool *pgxpool.Pool
}

func NewOrderRepo(pool *pgxpool.Pool) *OrderRepo {
	return &OrderRepo{pool: pool}
}

type RPCItemPayload struct {
	ProductID uuid.UUID `json:"product_id"`
	Quantity  int       `json:"quantity"`
	Discount  float64   `json:"discount"`
}

func (r *OrderRepo) ExecuteAtomicCheckout(ctx context.Context, merchantID uuid.UUID, req model.CheckoutRequest) (*model.CheckoutResult, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to start database transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Set Supabase auth context so auth.uid() in RPC resolves to merchantID
	jwtClaims := fmt.Sprintf(`{"sub":"%s","role":"authenticated"}`, merchantID.String())
	_, err = tx.Exec(ctx, "SELECT set_config('request.jwt.claims', $1, true)", jwtClaims)
	if err != nil {
		return nil, fmt.Errorf("failed to set auth context: %w", err)
	}

	// 2. Prepare items JSON payload
	var itemsPayload []RPCItemPayload
	for _, it := range req.Items {
		itemsPayload = append(itemsPayload, RPCItemPayload{
			ProductID: it.ProductID,
			Quantity:  it.Quantity,
			Discount:  it.Discount,
		})
	}
	itemsJSON, err := json.Marshal(itemsPayload)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize items: %w", err)
	}

	var customerID *uuid.UUID
	if req.CustomerID != nil && *req.CustomerID != "" && *req.CustomerID != "general" {
		if parsed, err := uuid.Parse(*req.CustomerID); err == nil {
			customerID = &parsed
		}
	}

	// 3. Execute pos_checkout_atomic RPC
	var resultJSON []byte
	query := "SELECT public.pos_checkout_atomic($1, $2, $3, $4, $5, $6)"
	err = tx.QueryRow(ctx, query, itemsJSON, req.PaymentMethod, req.PaidAmount, customerID, req.DiscountAmount, req.Notes).Scan(&resultJSON)
	if err != nil {
		return nil, err
	}

	// 4. Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit checkout transaction: %w", err)
	}

	// 5. Unmarshal result
	var result model.CheckoutResult
	if err := json.Unmarshal(resultJSON, &result); err != nil {
		return nil, fmt.Errorf("failed to parse checkout result: %w", err)
	}

	return &result, nil
}

func (r *OrderRepo) FindRecentOrders(ctx context.Context, merchantID uuid.UUID, limit int) ([]model.Order, error) {
	if limit <= 0 {
		limit = 20
	}

	query := `
		SELECT o.id, o.merchant_id, o.customer_id, o.order_number, o.status,
		       o.subtotal, o.discount_amount, o.total_amount, o.notes, o.created_at,
		       c.name as customer_name, c.phone as customer_phone
		FROM orders o
		LEFT JOIN customers c ON c.id = o.customer_id
		WHERE o.merchant_id = $1
		ORDER BY o.created_at DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, merchantID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []model.Order
	for rows.Next() {
		var o model.Order
		var cName, cPhone *string

		err := rows.Scan(
			&o.ID, &o.MerchantID, &o.CustomerID, &o.OrderNumber, &o.Status,
			&o.Subtotal, &o.DiscountAmount, &o.TotalAmount, &o.Notes, &o.CreatedAt,
			&cName, &cPhone,
		)
		if err != nil {
			return nil, err
		}

		if o.CustomerID != nil && cName != nil {
			o.Customer = &model.Customer{
				ID:    *o.CustomerID,
				Name:  *cName,
				Phone: cPhone,
			}
		}

		orders = append(orders, o)
	}

	return orders, rows.Err()
}

func (r *OrderRepo) MapPostgresError(err error) error {
	if err == nil {
		return nil
	}
	msg := err.Error()
	if contains(msg, "Stok barang tidak mencukupi") {
		return apperror.ErrInsufficientStock
	}
	if contains(msg, "Nominal pembayaran lebih kecil") {
		return apperror.ErrInsufficientPay
	}
	if contains(msg, "Keranjang tidak boleh kosong") {
		return apperror.ErrValidation("Keranjang tidak boleh kosong.")
	}
	if contains(msg, "Sebagian produk tidak ditemukan") {
		return apperror.ErrValidation("Sebagian produk tidak ditemukan atau tidak aktif.")
	}
	return apperror.New("CHECKOUT_ERROR", msg, 400)
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || (len(s) > 0 && len(substr) > 0 && stringContains(s, substr)))
}

func stringContains(s, substr string) bool {
	for i := 0; i+len(substr) <= len(s); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
