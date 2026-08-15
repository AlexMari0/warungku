//go:build integration

package repo_test

import (
	"context"
	"testing"
	"warungku-backend/internal/repo"

	"github.com/stretchr/testify/suite"
)

type ProductRepoIntegrationTestSuite struct {
	suite.Suite
	// db *pgxpool.Pool -> In the future we initialize real DB here
	repo repo.IProductRepo
}

func (suite *ProductRepoIntegrationTestSuite) SetupSuite() {
	// e.g. connect to test DB, run mock seeds
}

func (suite *ProductRepoIntegrationTestSuite) TestIntegration_FindAll() {
	suite.T().Skip("Not implemented yet, requires test database connection")
}

func TestProductRepoIntegration(t *testing.T) {
	suite.Run(t, new(ProductRepoIntegrationTestSuite))
}
