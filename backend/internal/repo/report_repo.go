package repo

import (
	"context"
	"time"
	"warungku-backend/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ReportRepo struct {
	pool *pgxpool.Pool
}

func NewReportRepo(pool *pgxpool.Pool) *ReportRepo {
	return &ReportRepo{pool: pool}
}

func (r *ReportRepo) RefreshAnalytics(ctx context.Context, merchantID uuid.UUID, date string) error {
	_, err := r.pool.Exec(ctx, "SELECT public.refresh_merchant_analytics($1, $2::date)", merchantID, date)
	return err
}

func (r *ReportRepo) FetchDailySummaries(ctx context.Context, merchantID uuid.UUID, startDate, endDate string) ([]model.DailySummary, error) {
	query := `
		SELECT id, merchant_id, summary_date, total_orders, total_revenue, total_cogs,
		       gross_profit, total_discount, total_items_sold, avg_transaction,
		       top_payment_method, storefront_page_views, storefront_whatsapp_clicks,
		       storefront_conversions, refreshed_at
		FROM daily_summaries
		WHERE merchant_id = $1
		  AND summary_date >= $2::date
		  AND summary_date <= $3::date
		ORDER BY summary_date ASC
	`

	rows, err := r.pool.Query(ctx, query, merchantID, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var summaries []model.DailySummary
	for rows.Next() {
		var s model.DailySummary
		var sDate time.Time
		err := rows.Scan(
			&s.ID, &s.MerchantID, &sDate, &s.TotalOrders, &s.TotalRevenue, &s.TotalCOGS,
			&s.GrossProfit, &s.TotalDiscount, &s.TotalItemsSold, &s.AvgTransaction,
			&s.TopPaymentMethod, &s.StorefrontPageViews, &s.StorefrontWhatsappClicks,
			&s.StorefrontConversions, &s.RefreshedAt,
		)
		if err != nil {
			return nil, err
		}
		s.SummaryDate = sDate.Format("2006-01-02")
		summaries = append(summaries, s)
	}

	return summaries, rows.Err()
}

func (r *ReportRepo) FetchHourlyTraffic(ctx context.Context, merchantID uuid.UUID, date string) ([]model.HourlyTraffic, error) {
	query := `
		SELECT id, merchant_id, summary_date, hour_bucket, order_count, revenue
		FROM hourly_traffic
		WHERE merchant_id = $1 AND summary_date = $2::date
		ORDER BY hour_bucket ASC
	`

	rows, err := r.pool.Query(ctx, query, merchantID, date)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var traffic []model.HourlyTraffic
	for rows.Next() {
		var ht model.HourlyTraffic
		var sDate time.Time
		err := rows.Scan(&ht.ID, &ht.MerchantID, &sDate, &ht.HourBucket, &ht.OrderCount, &ht.Revenue)
		if err != nil {
			return nil, err
		}
		ht.SummaryDate = sDate.Format("2006-01-02")
		traffic = append(traffic, ht)
	}

	return traffic, rows.Err()
}

func (r *ReportRepo) FetchProductSales(ctx context.Context, merchantID uuid.UUID, periodType, periodStart string) ([]model.ProductSalesSummary, error) {
	query := `
		SELECT pss.id, pss.merchant_id, pss.product_id, pss.period_type, pss.period_start,
		       pss.quantity_sold, pss.revenue, pss.cogs, pss.gross_profit, pss.return_quantity,
		       p.name, p.sku, c.name as category_name, c.color as category_color
		FROM product_sales_summary pss
		JOIN products p ON p.id = pss.product_id
		LEFT JOIN categories c ON c.id = p.category_id
		WHERE pss.merchant_id = $1
		  AND pss.period_type = $2
		  AND pss.period_start = $3::date
		ORDER BY pss.revenue DESC
	`

	rows, err := r.pool.Query(ctx, query, merchantID, periodType, periodStart)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.ProductSalesSummary
	for rows.Next() {
		var ps model.ProductSalesSummary
		var pStart time.Time
		var pName string
		var pSKU, catName, catColor *string

		err := rows.Scan(
			&ps.ID, &ps.MerchantID, &ps.ProductID, &ps.PeriodType, &pStart,
			&ps.QuantitySold, &ps.Revenue, &ps.COGS, &ps.GrossProfit, &ps.ReturnQuantity,
			&pName, &pSKU, &catName, &catColor,
		)
		if err != nil {
			return nil, err
		}

		ps.PeriodStart = pStart.Format("2006-01-02")
		ps.Name = pName
		ps.SKU = pSKU
		if catName != nil {
			ps.Category = *catName
		}
		ps.Color = catColor

		list = append(list, ps)
	}

	return list, rows.Err()
}

func (r *ReportRepo) FetchPaymentSummaries(ctx context.Context, merchantID uuid.UUID, periodType, periodStart string) ([]model.PaymentMethodSummary, error) {
	query := `
		SELECT id, merchant_id, period_type, period_start, method, transaction_count, total_amount
		FROM payment_method_summary
		WHERE merchant_id = $1
		  AND period_type = $2
		  AND period_start = $3::date
		ORDER BY total_amount DESC
	`

	rows, err := r.pool.Query(ctx, query, merchantID, periodType, periodStart)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.PaymentMethodSummary
	for rows.Next() {
		var pms model.PaymentMethodSummary
		var pStart time.Time

		err := rows.Scan(
			&pms.ID, &pms.MerchantID, &pms.PeriodType, &pStart,
			&pms.Method, &pms.TransactionCount, &pms.TotalAmount,
		)
		if err != nil {
			return nil, err
		}

		pms.PeriodStart = pStart.Format("2006-01-02")
		list = append(list, pms)
	}

	return list, rows.Err()
}
