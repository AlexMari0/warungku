package service

import (
	"context"
	"time"
	"warungku-backend/internal/model"
	"warungku-backend/internal/repo"

	"github.com/google/uuid"
)

type ReportService struct {
	repo *repo.ReportRepo
}

func NewReportService(repo *repo.ReportRepo) *ReportService {
	return &ReportService{repo: repo}
}

type DateRange struct {
	StartDate     string
	EndDate       string
	PrevStartDate string
	PrevEndDate   string
}

func calculateDateRange(period string, customStart, customEnd string) DateRange {
	now := time.Now().UTC()

	var start, end time.Time

	switch period {
	case "today":
		start = now
		end = now
	case "week":
		day := int(now.Weekday())
		if day == 0 {
			day = 7
		}
		start = now.AddDate(0, 0, -(day - 1))
		end = now
	case "month":
		start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
		end = now
	default:
		if customStart != "" {
			parsedStart, err := time.Parse("2006-01-02", customStart)
			if err == nil {
				start = parsedStart
			} else {
				start = now
			}
		} else {
			start = now
		}

		if customEnd != "" {
			parsedEnd, err := time.Parse("2006-01-02", customEnd)
			if err == nil {
				end = parsedEnd
			} else {
				end = now
			}
		} else {
			end = now
		}
	}

	startDate := start.Format("2006-01-02")
	endDate := end.Format("2006-01-02")

	duration := end.Sub(start)
	prevStart := start.Add(-duration - 24*time.Hour)
	prevEnd := start.Add(-24 * time.Hour)

	return DateRange{
		StartDate:     startDate,
		EndDate:       endDate,
		PrevStartDate: prevStart.Format("2006-01-02"),
		PrevEndDate:   prevEnd.Format("2006-01-02"),
	}
}

func (s *ReportService) FetchDashboard(ctx context.Context, merchantID uuid.UUID, period, customStart, customEnd string) (*model.DashboardResponse, error) {
	dr := calculateDateRange(period, customStart, customEnd)

	// 1. Fetch daily summaries between prevStartDate and endDate
	allSummaries, err := s.repo.FetchDailySummaries(ctx, merchantID, dr.PrevStartDate, dr.EndDate)
	if err != nil {
		return nil, err
	}

	var currentSummaries []model.DailySummary
	var prevSummaries []model.DailySummary

	for _, sm := range allSummaries {
		if sm.SummaryDate >= dr.StartDate && sm.SummaryDate <= dr.EndDate {
			currentSummaries = append(currentSummaries, sm)
		} else if sm.SummaryDate >= dr.PrevStartDate && sm.SummaryDate <= dr.PrevEndDate {
			prevSummaries = append(prevSummaries, sm)
		}
	}

	// 2. Aggregate current period summary
	var curRevenue, curCOGS, curProfit, curDiscount float64
	var curOrders, curItemsSold, curViews, curClicks, curConversions int
	var topPaymentMethod *string

	for _, sm := range currentSummaries {
		curRevenue += sm.TotalRevenue
		curCOGS += sm.TotalCOGS
		curProfit += sm.GrossProfit
		curDiscount += sm.TotalDiscount
		curOrders += sm.TotalOrders
		curItemsSold += sm.TotalItemsSold
		curViews += sm.StorefrontPageViews
		curClicks += sm.StorefrontWhatsappClicks
		curConversions += sm.StorefrontConversions
		if sm.TopPaymentMethod != nil {
			topPaymentMethod = sm.TopPaymentMethod
		}
	}

	var avgTx float64
	if curOrders > 0 {
		avgTx = curRevenue / float64(curOrders)
	}

	aggregatedSummary := &model.DailySummary{
		MerchantID:               merchantID,
		SummaryDate:              dr.StartDate,
		TotalOrders:              curOrders,
		TotalRevenue:             curRevenue,
		TotalCOGS:                curCOGS,
		GrossProfit:              curProfit,
		TotalDiscount:            curDiscount,
		TotalItemsSold:           curItemsSold,
		AvgTransaction:           avgTx,
		TopPaymentMethod:         topPaymentMethod,
		StorefrontPageViews:      curViews,
		StorefrontWhatsappClicks: curClicks,
		StorefrontConversions:    curConversions,
	}

	// 3. Aggregate previous period summary for comparison
	var prevRevenue, prevProfit float64
	var prevOrders, prevViews, prevClicks, prevConversions int
	for _, sm := range prevSummaries {
		prevRevenue += sm.TotalRevenue
		prevProfit += sm.GrossProfit
		prevOrders += sm.TotalOrders
		prevViews += sm.StorefrontPageViews
		prevClicks += sm.StorefrontWhatsappClicks
		prevConversions += sm.StorefrontConversions
	}
	var prevAvgTx float64
	if prevOrders > 0 {
		prevAvgTx = prevRevenue / float64(prevOrders)
	}

	calcChange := func(cur, prev float64) float64 {
		if prev == 0 {
			if cur > 0 {
				return 100
			}
			return 0
		}
		return ((cur - prev) / prev) * 100
	}

	comparison := model.SummaryComparison{
		TotalRevenue:             calcChange(curRevenue, prevRevenue),
		GrossProfit:              calcChange(curProfit, prevProfit),
		TotalOrders:              int(calcChange(float64(curOrders), float64(prevOrders))),
		AvgTransaction:           calcChange(avgTx, prevAvgTx),
		StorefrontPageViews:      int(calcChange(float64(curViews), float64(prevViews))),
		StorefrontWhatsappClicks: int(calcChange(float64(curClicks), float64(prevClicks))),
		StorefrontConversions:    int(calcChange(float64(curConversions), float64(prevConversions))),
	}

	// 4. Fetch hourly traffic for the selected end date
	traffic, err := s.repo.FetchHourlyTraffic(ctx, merchantID, dr.EndDate)
	if err != nil {
		traffic = []model.HourlyTraffic{}
	}

	// 5. Fetch product sales summaries
	periodType := "daily"
	if period == "week" {
		periodType = "weekly"
	} else if period == "month" {
		periodType = "monthly"
	}
	productSales, err := s.repo.FetchProductSales(ctx, merchantID, periodType, dr.StartDate)
	if err != nil {
		productSales = []model.ProductSalesSummary{}
	}

	// 6. Fetch payment summaries
	paymentSummaries, err := s.repo.FetchPaymentSummaries(ctx, merchantID, periodType, dr.StartDate)
	if err != nil {
		paymentSummaries = []model.PaymentMethodSummary{}
	}

	return &model.DashboardResponse{
		Summary:           aggregatedSummary,
		SummaryComparison: comparison,
		HourlyTraffic:     traffic,
		ProductSales:      productSales,
		PaymentSummaries:  paymentSummaries,
	}, nil
}

func (s *ReportService) RefreshAnalytics(ctx context.Context, merchantID uuid.UUID, dateStr string) error {
	if dateStr == "" {
		dateStr = time.Now().UTC().Format("2006-01-02")
	}
	return s.repo.RefreshAnalytics(ctx, merchantID, dateStr)
}
