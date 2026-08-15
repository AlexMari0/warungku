package service

import (
	"context"
	"testing"
	"warungku-backend/internal/model"
	mockrepo "warungku-backend/mocks/repo"

	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
)

type ProductServiceTestSuite struct {
	suite.Suite
	mockProductRepo       *mockrepo.MockIProductRepo
	mockStockMovementRepo *mockrepo.MockIStockMovementRepo
	svc                   *ProductService
	ctx                   context.Context
	merchantID            uuid.UUID
}

func (suite *ProductServiceTestSuite) SetupTest() {
	suite.mockProductRepo = mockrepo.NewMockIProductRepo(suite.T())
	suite.mockStockMovementRepo = mockrepo.NewMockIStockMovementRepo(suite.T())
	suite.svc = NewProductService(suite.mockProductRepo, suite.mockStockMovementRepo)
	suite.ctx = context.Background()
	suite.merchantID = uuid.New()
}

func (suite *ProductServiceTestSuite) TestCreateProduct_RejectsEmptyName() {
	_, err := suite.svc.CreateProduct(suite.ctx, suite.merchantID, model.CreateProductRequest{
		Name:      " ",
		SellPrice: 10000,
		BuyPrice:  5000,
		Unit:      "pcs",
	})
	suite.Error(err)
	suite.Contains(err.Error(), "minimal 2 karakter")
}

func (suite *ProductServiceTestSuite) TestCreateProduct_RejectsNegativeSellPrice() {
	_, err := suite.svc.CreateProduct(suite.ctx, suite.merchantID, model.CreateProductRequest{
		Name:      "Indomie Goreng",
		SellPrice: -1000,
		BuyPrice:  2500,
		Unit:      "pcs",
	})
	suite.Error(err)
	suite.Contains(err.Error(), "Harga jual tidak boleh negatif")
}

func (suite *ProductServiceTestSuite) TestCreateProduct_RejectsNegativeBuyPrice() {
	_, err := suite.svc.CreateProduct(suite.ctx, suite.merchantID, model.CreateProductRequest{
		Name:      "Indomie Goreng",
		SellPrice: 3500,
		BuyPrice:  -500,
		Unit:      "pcs",
	})
	suite.Error(err)
	suite.Contains(err.Error(), "Harga beli tidak boleh negatif")
}

func (suite *ProductServiceTestSuite) TestUpdateProduct_RejectsShortName() {
	shortName := "x"
	_, err := suite.svc.UpdateProduct(suite.ctx, suite.merchantID, uuid.New(), model.UpdateProductRequest{
		Name: &shortName,
	})
	suite.Error(err)
	suite.Contains(err.Error(), "minimal 2 karakter")
}

func (suite *ProductServiceTestSuite) TestCreateProduct_Success() {
	req := model.CreateProductRequest{
		Name:      "Indomie Goreng",
		SellPrice: 3500,
		BuyPrice:  2500,
		Unit:      "pcs",
	}

	expectedProduct := &model.Product{
		ID:         uuid.New(),
		MerchantID: suite.merchantID,
		Name:       "Indomie Goreng",
		SellPrice:  3500,
		BuyPrice:   2500,
		Unit:       "pcs",
	}

	// We expect the repository's Create method to be called exactly once
	suite.mockProductRepo.On("Create", suite.ctx, suite.merchantID, req).Return(expectedProduct, nil).Once()

	res, err := suite.svc.CreateProduct(suite.ctx, suite.merchantID, req)
	suite.NoError(err)
	suite.Equal(expectedProduct, res)
	
	// Assert expectations
	suite.mockProductRepo.AssertExpectations(suite.T())
}

// In order for 'go test' to run this suite, we need to create a normal test function
// that passes our suite to suite.Run
func TestProductServiceTestSuite(t *testing.T) {
	suite.Run(t, new(ProductServiceTestSuite))
}
