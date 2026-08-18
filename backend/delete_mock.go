package main

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/google/uuid"
)

func main() {
	godotenv.Load(".env")
	dbUrl := os.Getenv("DATABASE_URL")
	db, err := pgxpool.New(context.Background(), dbUrl)
	if err != nil {
		fmt.Println("Error connection:", err)
		os.Exit(1)
	}

	ctx := context.Background()
	var merchantID uuid.UUID
	err = db.QueryRow(ctx, `SELECT id FROM public.merchants JOIN auth.users u ON u.id = user_id WHERE u.email = 'sukses@warungku.mock'`).Scan(&merchantID)
	if err == nil {
		db.Exec(ctx, `DELETE FROM public.payments WHERE order_id IN (SELECT id FROM public.orders WHERE merchant_id = $1)`, merchantID)
		db.Exec(ctx, `DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE merchant_id = $1)`, merchantID)
		db.Exec(ctx, `DELETE FROM public.orders WHERE merchant_id = $1`, merchantID)
		db.Exec(ctx, `DELETE FROM public.stock_movements WHERE product_id IN (SELECT id FROM public.products WHERE merchant_id = $1)`, merchantID)
		db.Exec(ctx, `DELETE FROM public.products WHERE merchant_id = $1`, merchantID)
		db.Exec(ctx, `DELETE FROM public.categories WHERE merchant_id = $1`, merchantID)
		db.Exec(ctx, `DELETE FROM public.customers WHERE merchant_id = $1`, merchantID)
	}

	db.Exec(context.Background(), "DELETE FROM public.seed_data_migrations WHERE name = 'warung_sukses'")
	_, err = db.Exec(context.Background(), "DELETE FROM auth.users WHERE email = 'sukses@warungku.mock'")
	if err != nil {
		fmt.Println("Error deleting auth.users:", err)
	}
	fmt.Println("Cleaned!")
}
