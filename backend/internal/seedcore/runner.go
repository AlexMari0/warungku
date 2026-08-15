package seedcore

import (
	"context"
	"fmt"
	"log"
	"sort"
	"time"
)

// Runner manages the registration and execution of seeds.
type Runner struct {
	svc   *Services
	seeds []Seed
}

func NewRunner(svc *Services) *Runner {
	return &Runner{
		svc:   svc,
		seeds: make([]Seed, 0),
	}
}

// Register adds a seed to the runner.
func (r *Runner) Register(s Seed) {
	r.seeds = append(r.seeds, s)
}

// Run executes all pending seeds in Up direction.
func (r *Runner) Run(ctx context.Context) error {
	r.sortSeeds()

	for _, s := range r.seeds {
		isDone, err := r.isSeedDone(ctx, s)
		if err != nil {
			return fmt.Errorf("failed to check seed state %s: %w", s.Name(), err)
		}
		if isDone {
			log.Printf("SKIP: [%s] %s (v%d)", s.Group(), s.Name(), s.Version())
			continue
		}

		log.Printf("UP  : [%s] %s (v%d)", s.Group(), s.Name(), s.Version())
		if err := r.markDirty(ctx, s); err != nil {
			return err
		}

		if err := s.Up(ctx, r.svc); err != nil {
			return fmt.Errorf("failed executing UP for %s: %w", s.Name(), err)
		}

		if err := r.markDone(ctx, s); err != nil {
			return err
		}
	}
	return nil
}

// Rollback executes all executed seeds in Down direction, in reverse order.
func (r *Runner) Rollback(ctx context.Context) error {
	r.sortSeeds()

	// Reverse iterate
	for i := len(r.seeds) - 1; i >= 0; i-- {
		s := r.seeds[i]
		isDone, err := r.isSeedDone(ctx, s)
		if err != nil {
			return fmt.Errorf("failed to check seed state %s: %w", s.Name(), err)
		}
		if !isDone {
			continue
		}

		log.Printf("DOWN: [%s] %s (v%d)", s.Group(), s.Name(), s.Version())
		if err := r.markDirty(ctx, s); err != nil {
			return err
		}

		if err := s.Down(ctx, r.svc); err != nil {
			return fmt.Errorf("failed executing DOWN for %s: %w", s.Name(), err)
		}

		if err := r.removeSeed(ctx, s); err != nil {
			return err
		}
	}
	return nil
}

func (r *Runner) sortSeeds() {
	sort.Slice(r.seeds, func(i, j int) bool {
		// 1. Group: "global" first, others alphabetically
		gi, gj := r.seeds[i].Group(), r.seeds[j].Group()
		if gi == "global" && gj != "global" {
			return true
		}
		if gj == "global" && gi != "global" {
			return false
		}
		if gi != gj {
			return gi < gj
		}
		// 2. Version
		vi, vj := r.seeds[i].Version(), r.seeds[j].Version()
		if vi != vj {
			return vi < vj
		}
		// 3. Name
		return r.seeds[i].Name() < r.seeds[j].Name()
	})
}

func (r *Runner) isSeedDone(ctx context.Context, s Seed) (bool, error) {
	var status string
	err := r.svc.DB.QueryRow(ctx, 
		"SELECT status FROM public.seed_data_migrations WHERE group_name=$1 AND version=$2 AND name=$3",
		s.Group(), s.Version(), s.Name(),
	).Scan(&status)

	if err != nil {
		if err.Error() == "no rows in result set" {
			return false, nil
		}
		return false, err
	}

	if status == "dirty" {
		log.Printf("WARNING: Seed %s was marked dirty, treating as not done.", s.Name())
		return false, nil
	}

	return status == "done", nil
}

func (r *Runner) markDirty(ctx context.Context, s Seed) error {
	_, err := r.svc.DB.Exec(ctx,
		`INSERT INTO public.seed_data_migrations (group_name, version, name, status, executed_at) 
		VALUES ($1, $2, $3, 'dirty', $4)
		ON CONFLICT (group_name, version, name) DO UPDATE SET status = 'dirty', executed_at = $4`,
		s.Group(), s.Version(), s.Name(), time.Now(),
	)
	return err
}

func (r *Runner) markDone(ctx context.Context, s Seed) error {
	_, err := r.svc.DB.Exec(ctx,
		`UPDATE public.seed_data_migrations SET status = 'done', executed_at = $4
		WHERE group_name=$1 AND version=$2 AND name=$3`,
		s.Group(), s.Version(), s.Name(), time.Now(),
	)
	return err
}

func (r *Runner) removeSeed(ctx context.Context, s Seed) error {
	_, err := r.svc.DB.Exec(ctx,
		`DELETE FROM public.seed_data_migrations WHERE group_name=$1 AND version=$2 AND name=$3`,
		s.Group(), s.Version(), s.Name(),
	)
	return err
}
