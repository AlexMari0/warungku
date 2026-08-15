package repo

import (
	"context"
	"warungku-backend/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AIRepo struct {
	pool *pgxpool.Pool
}

func NewAIRepo(pool *pgxpool.Pool) *AIRepo {
	return &AIRepo{pool: pool}
}

type MatchedDocument struct {
	ID             uuid.UUID `json:"id"`
	ContentPayload string    `json:"content_payload"`
	Similarity     float64   `json:"similarity"`
}

func (r *AIRepo) FindSessions(ctx context.Context, merchantID uuid.UUID) ([]model.AISession, error) {
	query := `
		SELECT id, merchant_id, title, context_snapshot, last_active_at, created_at
		FROM ai_sessions
		WHERE merchant_id = $1
		ORDER BY last_active_at DESC
	`

	rows, err := r.pool.Query(ctx, query, merchantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []model.AISession
	for rows.Next() {
		var s model.AISession
		if err := rows.Scan(&s.ID, &s.MerchantID, &s.Title, &s.ContextSnapshot, &s.LastActiveAt, &s.CreatedAt); err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}

	return sessions, rows.Err()
}

func (r *AIRepo) FindSessionByID(ctx context.Context, merchantID, sessionID uuid.UUID) (*model.AISession, error) {
	query := `
		SELECT id, merchant_id, title, context_snapshot, last_active_at, created_at
		FROM ai_sessions
		WHERE id = $1 AND merchant_id = $2
	`

	var s model.AISession
	err := r.pool.QueryRow(ctx, query, sessionID, merchantID).Scan(
		&s.ID, &s.MerchantID, &s.Title, &s.ContextSnapshot, &s.LastActiveAt, &s.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &s, nil
}

func (r *AIRepo) CreateSession(ctx context.Context, merchantID uuid.UUID, title string) (*model.AISession, error) {
	snapshot := map[string]any{"source": "go_api"}
	query := `
		INSERT INTO ai_sessions (merchant_id, title, context_snapshot)
		VALUES ($1, $2, $3)
		RETURNING id, merchant_id, title, context_snapshot, last_active_at, created_at
	`

	var s model.AISession
	err := r.pool.QueryRow(ctx, query, merchantID, title, snapshot).Scan(
		&s.ID, &s.MerchantID, &s.Title, &s.ContextSnapshot, &s.LastActiveAt, &s.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &s, nil
}

func (r *AIRepo) DeleteSession(ctx context.Context, merchantID, sessionID uuid.UUID) (bool, error) {
	cmd, err := r.pool.Exec(ctx, "DELETE FROM ai_sessions WHERE id = $1 AND merchant_id = $2", sessionID, merchantID)
	if err != nil {
		return false, err
	}
	return cmd.RowsAffected() > 0, nil
}

func (r *AIRepo) FindQueryLogs(ctx context.Context, merchantID, sessionID uuid.UUID) ([]model.AIQueryLog, error) {
	query := `
		SELECT ql.id, ql.session_id, ql.merchant_id, ql.query_text, ql.response_text,
		       ql.query_type, ql.tokens_used, ql.latency_ms, ql.model_version, ql.created_at,
		       fb.rating
		FROM ai_query_logs ql
		LEFT JOIN ai_feedback fb ON fb.query_log_id = ql.id
		WHERE ql.merchant_id = $1 AND ql.session_id = $2
		ORDER BY ql.created_at ASC
	`

	rows, err := r.pool.Query(ctx, query, merchantID, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []model.AIQueryLog
	for rows.Next() {
		var l model.AIQueryLog
		var rating *string
		err := rows.Scan(
			&l.ID, &l.SessionID, &l.MerchantID, &l.QueryText, &l.ResponseText,
			&l.QueryType, &l.TokensUsed, &l.LatencyMs, &l.ModelVersion, &l.CreatedAt,
			&rating,
		)
		if err != nil {
			return nil, err
		}
		l.Rating = rating
		logs = append(logs, l)
	}

	return logs, rows.Err()
}

func (r *AIRepo) InsertQueryLog(ctx context.Context, l *model.AIQueryLog) error {
	query := `
		INSERT INTO ai_query_logs (session_id, merchant_id, query_text, response_text, query_type, tokens_used, latency_ms, model_version)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at
	`

	return r.pool.QueryRow(ctx, query,
		l.SessionID, l.MerchantID, l.QueryText, l.ResponseText,
		l.QueryType, l.TokensUsed, l.LatencyMs, l.ModelVersion,
	).Scan(&l.ID, &l.CreatedAt)
}

func (r *AIRepo) UpdateSessionLastActive(ctx context.Context, sessionID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, "UPDATE ai_sessions SET last_active_at = now() WHERE id = $1", sessionID)
	return err
}

func (r *AIRepo) MatchKnowledge(ctx context.Context, merchantID uuid.UUID, vectorStr string, threshold float64, count int) ([]MatchedDocument, error) {
	// match_merchant_knowledge RPC call
	query := `SELECT id, content_payload, similarity FROM public.match_merchant_knowledge($1, $2, $3)`

	rows, err := r.pool.Query(ctx, query, vectorStr, threshold, count)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []MatchedDocument
	for rows.Next() {
		var doc MatchedDocument
		if err := rows.Scan(&doc.ID, &doc.ContentPayload, &doc.Similarity); err != nil {
			return nil, err
		}
		docs = append(docs, doc)
	}

	return docs, rows.Err()
}

func (r *AIRepo) InsertFeedback(ctx context.Context, fb *model.AIFeedback) error {
	query := `
		INSERT INTO ai_feedback (query_log_id, merchant_id, rating, feedback_text)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`

	return r.pool.QueryRow(ctx, query, fb.QueryLogID, fb.MerchantID, fb.Rating, fb.FeedbackText).Scan(&fb.ID, &fb.CreatedAt)
}
