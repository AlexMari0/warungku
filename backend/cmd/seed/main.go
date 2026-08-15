package main

import (
	"context"
	"flag"
	"log"
	"os"

	mockdata "warungku-backend/cmd/seed/mock-data"
	"warungku-backend/internal/config"
	"warungku-backend/internal/repo"
	"warungku-backend/internal/seedcore"
	"warungku-backend/internal/service"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	upFlag := flag.Bool("up", false, "Execute mock seeding scenarios")
	downFlag := flag.Bool("down", false, "Rollback executed mock seeding scenarios")
	resetFlag := flag.Bool("reset", false, "Rollback then execute mock seeding scenarios")
	flag.Parse()

	if !*upFlag && !*downFlag && !*resetFlag {
		log.Fatal("Must specify -up, -down, or -reset flag")
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Connect to Database
	ctx := context.Background()
	db, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer db.Close()

	// Ensure seed table exists before anything else
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS public.seed_data_migrations (
		id SERIAL PRIMARY KEY,
		version INT NOT NULL,
		name VARCHAR(255) NOT NULL,
		group_name VARCHAR(255) NOT NULL,
		status VARCHAR(50) NOT NULL,
		executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		UNIQUE (group_name, version, name)
	);
	`
	if _, err := db.Exec(ctx, createTableSQL); err != nil {
		log.Fatalf("Failed to initialize seed_data_migrations table: %v", err)
	}

	// Initialize Repositories (we use the actual app repos)
	catRepo := repo.NewCategoryRepo(db)
	prodRepo := repo.NewProductRepo(db)
	stockRepo := repo.NewStockMovementRepo(db)

	// Initialize Services
	catSvc := service.NewCategoryService(catRepo)
	prodSvc := service.NewProductService(prodRepo, stockRepo)

	svcs := &seedcore.Services{
		DB:       db,
		Category: catSvc,
		Product:  prodSvc,
		// Instantiate other services as needed
	}

	runner := seedcore.NewRunner(svcs)
	mockdata.RegisterAll(runner)

	if *downFlag || *resetFlag {
		log.Println("--- Rolling back mock scenarios ---")
		if err := runner.Rollback(ctx); err != nil {
			log.Fatalf("Rollback failed: %v", err)
		}
	}

	if *upFlag || *resetFlag {
		log.Println("--- Executing mock scenarios ---")
		if err := runner.Run(ctx); err != nil {
			log.Fatalf("Execution failed: %v", err)
		}
	}

	log.Println("Done.")
	os.Exit(0)
}
