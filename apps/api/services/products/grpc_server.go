package products

import (
	"context"

	productpb "github.com/TadokoroYuki/konbini-navi/apps/api/gen/product"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type GRPCServer struct {
	productpb.UnimplementedProductServiceServer
	repo *Repository
}

func NewGRPCServer(repo *Repository) *GRPCServer {
	return &GRPCServer{repo: repo}
}

func (s *GRPCServer) GetProduct(ctx context.Context, req *productpb.GetProductRequest) (*productpb.Product, error) {
	p, err := s.repo.GetByID(ctx, req.GetProductId())
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get product: %v", err)
	}
	if p == nil {
		return nil, status.Error(codes.NotFound, "product not found")
	}
	return toProtoProduct(p), nil
}

func (s *GRPCServer) SearchProducts(ctx context.Context, req *productpb.SearchProductsRequest) (*productpb.SearchProductsResponse, error) {
	products, err := s.repo.Search(ctx, req.GetQuery(), req.GetBrand(), req.GetCategory(), int(req.GetLimit()))
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to search products: %v", err)
	}

	pbProducts := make([]*productpb.Product, len(products))
	for i, p := range products {
		p := p
		pbProducts[i] = toProtoProduct(&p)
	}

	return &productpb.SearchProductsResponse{Products: pbProducts}, nil
}
