package records

import (
	"context"
	"crypto/rand"
	"log"
	"net/http"
	"net/url"
	"time"

	"github.com/oklog/ulid/v2"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	productpb "github.com/TadokoroYuki/konbini-navi/apps/api/gen/product"
	recordpb "github.com/TadokoroYuki/konbini-navi/apps/api/gen/record"
	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/model"
)

type GRPCServer struct {
	recordpb.UnimplementedRecordServiceServer
	repo               *Repository
	productClient      *ProductClient
	recommendationsURL string
}

func NewGRPCServer(repo *Repository, productClient *ProductClient, recommendationsURL string) *GRPCServer {
	return &GRPCServer{repo: repo, productClient: productClient, recommendationsURL: recommendationsURL}
}

var grpcRefreshClient = &http.Client{Timeout: 10 * time.Second}

func (s *GRPCServer) refreshRecommendation(userID string) {
	if s.recommendationsURL == "" {
		return
	}
	go func() {
		refreshURL := s.recommendationsURL + "/v1/users/" + url.PathEscape(userID) + "/recommendations/refresh"
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		req, err := http.NewRequestWithContext(ctx, "POST", refreshURL, nil)
		if err != nil {
			log.Printf("failed to create refresh request: %v", err)
			return
		}
		resp, err := grpcRefreshClient.Do(req)
		if err != nil {
			log.Printf("failed to refresh recommendation for %s: %v", userID, err)
			return
		}
		resp.Body.Close()
	}()
}

func (s *GRPCServer) ListRecords(ctx context.Context, req *recordpb.ListRecordsRequest) (*recordpb.ListRecordsResponse, error) {
	records, err := s.repo.ListByUserAndDate(ctx, req.GetUserId(), req.GetDate())
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list records: %v", err)
	}

	pbRecords := make([]*recordpb.Record, len(records))
	for i, rec := range records {
		pbRecords[i] = toProtoRecord(&rec)
	}

	return &recordpb.ListRecordsResponse{Records: pbRecords}, nil
}

func (s *GRPCServer) ListAllRecords(ctx context.Context, req *recordpb.ListAllRecordsRequest) (*recordpb.ListRecordsResponse, error) {
	records, err := s.repo.ListByUserAndDate(ctx, req.GetUserId(), "")
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list all records: %v", err)
	}

	pbRecords := make([]*recordpb.Record, len(records))
	for i, rec := range records {
		pbRecords[i] = toProtoRecord(&rec)
	}

	return &recordpb.ListRecordsResponse{Records: pbRecords}, nil
}

func (s *GRPCServer) CreateRecord(ctx context.Context, req *recordpb.CreateRecordRequest) (*recordpb.Record, error) {
	// Verify product exists
	product, err := s.productClient.GetByID(ctx, req.GetProductId())
	if err != nil || product == nil {
		return nil, status.Error(codes.NotFound, "product not found")
	}

	recordID := ulid.MustNew(ulid.Timestamp(time.Now()), rand.Reader).String()

	record := &model.Record{
		RecordID:  recordID,
		UserID:    req.GetUserId(),
		ProductID: req.GetProductId(),
		Product:   product,
		Date:      req.GetDate(),
		MealType:  model.MealType(req.GetMealType()),
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}

	if err := s.repo.Create(ctx, record); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create record: %v", err)
	}

	s.refreshRecommendation(req.GetUserId())
	return toProtoRecord(record), nil
}

func (s *GRPCServer) DeleteRecord(ctx context.Context, req *recordpb.DeleteRecordRequest) (*recordpb.Empty, error) {
	if err := s.repo.Delete(ctx, req.GetUserId(), req.GetRecordId()); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to delete record: %v", err)
	}
	s.refreshRecommendation(req.GetUserId())
	return &recordpb.Empty{}, nil
}

func toProtoRecord(rec *model.Record) *recordpb.Record {
	pbRec := &recordpb.Record{
		RecordId:  rec.RecordID,
		UserId:    rec.UserID,
		ProductId: rec.ProductID,
		Date:      rec.Date,
		MealType:  string(rec.MealType),
		CreatedAt: rec.CreatedAt,
	}
	if rec.Product != nil {
		pbRec.Product = &productpb.Product{
			ProductId:   rec.Product.ProductID,
			Name:        rec.Product.Name,
			Brand:       string(rec.Product.Brand),
			Category:    string(rec.Product.Category),
			Price:       int32(rec.Product.Price),
			ImageUrl:    rec.Product.ImageURL,
			Description: rec.Product.Description,
			Nutrition: &productpb.Nutrition{
				Calories: rec.Product.Nutrition.Calories,
				Protein:  rec.Product.Nutrition.Protein,
				Fat:      rec.Product.Nutrition.Fat,
				Carbs:    rec.Product.Nutrition.Carbs,
				Fiber:    rec.Product.Nutrition.Fiber,
				Salt:     rec.Product.Nutrition.Salt,
			},
		}
	}
	return pbRec
}
