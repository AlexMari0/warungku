package seedcore

import (
	"context"
)

// Seed defines the interface for a mock data scenario seed.
type Seed interface {
	Name() string
	Group() string
	Version() int
	Up(ctx context.Context, svc *Services) error
	Down(ctx context.Context, svc *Services) error
}
