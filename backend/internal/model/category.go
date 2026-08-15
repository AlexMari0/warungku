package model

import (
	"time"

	"github.com/google/uuid"
)

type Category struct {
	ID        uuid.UUID `json:"id" db:"id"`
	MerchantID uuid.UUID `json:"merchant_id" db:"merchant_id"`
	Name      string    `json:"name" db:"name"`
	Color     *string   `json:"color" db:"color"`
	SortOrder int       `json:"sort_order" db:"sort_order"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type CreateCategoryRequest struct {
	Name      string  `json:"name" validate:"required,min=2,max=100"`
	Color     *string `json:"color" validate:"omitempty,hexcolor|startswith=#"`
	SortOrder *int    `json:"sort_order" validate:"omitempty,gte=0"`
}

type UpdateCategoryRequest struct {
	Name      *string `json:"name" validate:"omitempty,min=2,max=100"`
	Color     *string `json:"color" validate:"omitempty,hexcolor|startswith=#"`
	SortOrder *int    `json:"sort_order" validate:"omitempty,gte=0"`
}
