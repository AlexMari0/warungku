package mockdata

import (
	"context"
	"fmt"
	"warungku-backend/internal/seedcore"

	"github.com/google/uuid"
)

type ScenarioWarungKosong struct {
	merchantID uuid.UUID
}

func (s *ScenarioWarungKosong) Name() string {
	return "warung_kosong"
}

func (s *ScenarioWarungKosong) Group() string {
	return "scenario_warung_kosong"
}

func (s *ScenarioWarungKosong) Version() int {
	return 1
}

func (s *ScenarioWarungKosong) Up(ctx context.Context, svc *seedcore.Services) error {
	// Bypass RLS and create a mock user in auth.users
	userID := uuid.New()
	_, err := svc.DB.Exec(ctx, `
		INSERT INTO auth.users (id, email, raw_user_meta_data)
		VALUES ($1, 'kosong@warungku.mock', '{"business_name": "Warung Kosong"}')
		ON CONFLICT (id) DO NOTHING
	`, userID)
	if err != nil {
		return fmt.Errorf("failed to insert mock auth user: %w", err)
	}

	return nil
}

func (s *ScenarioWarungKosong) Down(ctx context.Context, svc *seedcore.Services) error {
	_, err := svc.DB.Exec(ctx, `DELETE FROM auth.users WHERE email = 'kosong@warungku.mock'`)
	return err
}
