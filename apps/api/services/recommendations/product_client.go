package recommendations

import (
	"context"

	productpb "github.com/TadokoroYuki/konbini-navi/apps/api/gen/product"
	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/model"
	"github.com/TadokoroYuki/konbini-navi/apps/api/services/products"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type ProductClient struct {
	client productpb.ProductServiceClient
}

func NewProductClient(addr string) (*ProductClient, error) {
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}
	return &ProductClient{client: productpb.NewProductServiceClient(conn)}, nil
}

func (c *ProductClient) SearchProducts(ctx context.Context, query string, brand string, category string, limit int) ([]model.Product, error) {
	resp, err := c.client.SearchProducts(ctx, &productpb.SearchProductsRequest{
		Query:    query,
		Brand:    brand,
		Category: category,
		Limit:    int32(limit),
	})
	if err != nil {
		return nil, err
	}

	result := make([]model.Product, len(resp.GetProducts()))
	for i, pb := range resp.GetProducts() {
		result[i] = products.FromProtoProduct(pb)
	}
	return result, nil
}
