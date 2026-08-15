package service

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"
	"warungku-backend/internal/apperror"
	"warungku-backend/internal/model"
	"warungku-backend/internal/repo"

	"github.com/google/uuid"
)

type AIService struct {
	repo *repo.AIRepo
}

func NewAIService(repo *repo.AIRepo) *AIService {
	return &AIService{repo: repo}
}

// mockEmbedding generates a deterministic pseudo-random 1536-dim vector based on text
func mockEmbedding(text string) []float64 {
	var hash int32
	for i := 0; i < len(text); i++ {
		hash = ((hash << 5) - hash) + int32(text[i])
	}

	vector := make([]float64, 1536)
	var sumSquares float64
	for i := 0; i < 1536; i++ {
		val := math.Sin(float64(hash + int32(i)))
		vector[i] = val
		sumSquares += val * val
	}

	mag := math.Sqrt(sumSquares)
	if mag > 0 {
		for i := 0; i < 1536; i++ {
			vector[i] /= mag
		}
	}

	return vector
}

func (s *AIService) ListSessions(ctx context.Context, merchantID uuid.UUID) ([]model.AISession, error) {
	return s.repo.FindSessions(ctx, merchantID)
}

func (s *AIService) CreateSession(ctx context.Context, merchantID uuid.UUID, customTitle string) (*model.AISession, error) {
	title := strings.TrimSpace(customTitle)
	if title == "" {
		sessions, _ := s.repo.FindSessions(ctx, merchantID)
		title = fmt.Sprintf("Analisis Baru #%d", len(sessions)+1)
	}

	return s.repo.CreateSession(ctx, merchantID, title)
}

func (s *AIService) DeleteSession(ctx context.Context, merchantID, sessionID uuid.UUID) error {
	deleted, err := s.repo.DeleteSession(ctx, merchantID, sessionID)
	if err != nil {
		return err
	}
	if !deleted {
		return apperror.ErrNotFound("Sesi AI")
	}
	return nil
}

func (s *AIService) GetSessionMessages(ctx context.Context, merchantID, sessionID uuid.UUID) ([]model.AIQueryLog, error) {
	return s.repo.FindQueryLogs(ctx, merchantID, sessionID)
}

func (s *AIService) Chat(ctx context.Context, merchantID uuid.UUID, req model.ChatRequest) (*model.ChatResponse, error) {
	startTime := time.Now()

	// 1. Verify that session belongs to merchant
	session, err := s.repo.FindSessionByID(ctx, merchantID, req.SessionID)
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, apperror.ErrForbidden
	}

	// 2. Generate embedding
	emb := mockEmbedding(req.QueryText)
	var strVals []string
	for _, val := range emb {
		strVals = append(strVals, fmt.Sprintf("%f", val))
	}
	vectorStr := fmt.Sprintf("[%s]", strings.Join(strVals, ","))

	// 3. Search knowledge base
	matchedDocs, err := s.repo.MatchKnowledge(ctx, merchantID, vectorStr, 0.1, 3)
	if err != nil {
		matchedDocs = []repo.MatchedDocument{}
	}

	// 4. Construct AI response text
	var contextSnippets []string
	for _, doc := range matchedDocs {
		if doc.ContentPayload != "" {
			contextSnippets = append(contextSnippets, fmt.Sprintf("- %s", doc.ContentPayload))
		}
	}

	var finalResponse string
	if len(contextSnippets) > 0 {
		contextBlock := strings.Join(contextSnippets, "\n")
		finalResponse = fmt.Sprintf("### 📚 Menjawab berdasarkan Pengetahuan Bisnis\n\nBerdasarkan data referensi Anda:\n%s\n\n**Kesimpulan untuk:** \"%s\"\n(Respons dihasilkan menggunakan pencocokan vektor pgvector dari %d sumber dataset.)", contextBlock, req.QueryText, len(matchedDocs))
	} else {
		finalResponse = fmt.Sprintf("Maaf, saya tidak menemukan informasi yang cukup di database vektor Anda untuk menjawab: \"%s\".", req.QueryText)
	}

	// 5. Insert query log
	queryType := "analysis"
	if req.QueryType != nil && *req.QueryType != "" {
		queryType = *req.QueryType
	}
	latency := int(time.Since(startTime).Milliseconds())
	tokensUsed := len(finalResponse) / 4

	logRecord := model.AIQueryLog{
		SessionID:    req.SessionID,
		MerchantID:   merchantID,
		QueryText:    req.QueryText,
		ResponseText: &finalResponse,
		QueryType:    queryType,
		TokensUsed:   tokensUsed,
		LatencyMs:    &latency,
		ModelVersion: "pgvector-go-v1",
	}

	if err := s.repo.InsertQueryLog(ctx, &logRecord); err != nil {
		return nil, err
	}

	// 6. Update session last active time
	_ = s.repo.UpdateSessionLastActive(ctx, req.SessionID)

	return &model.ChatResponse{
		Success: true,
		Message: logRecord,
	}, nil
}

func (s *AIService) SubmitFeedback(ctx context.Context, merchantID uuid.UUID, req model.SubmitFeedbackRequest) error {
	fb := model.AIFeedback{
		QueryLogID:   req.QueryLogID,
		MerchantID:   merchantID,
		Rating:       req.Rating,
		FeedbackText: req.FeedbackText,
	}
	return s.repo.InsertFeedback(ctx, &fb)
}
