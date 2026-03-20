package records

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

func (c *ProductClient) GetByID(ctx context.Context, productID string) (*model.Product, error) {
	resp, err := c.client.GetProduct(ctx, &productpb.GetProductRequest{ProductId: productID})
	if err != nil {
		return nil, err
	}
	p := products.FromProtoProduct(resp)
	return &p, nil
}
