package nutrition

import (
	"context"

	recordpb "github.com/TadokoroYuki/konbini-navi/apps/api/gen/record"
	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/model"
	"github.com/TadokoroYuki/konbini-navi/apps/api/services/records"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type RecordClient struct {
	client recordpb.RecordServiceClient
}

func NewRecordClient(addr string) (*RecordClient, error) {
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}
	return &RecordClient{client: recordpb.NewRecordServiceClient(conn)}, nil
}

func (c *RecordClient) ListByUserAndDate(ctx context.Context, userID string, date string) ([]model.Record, error) {
	resp, err := c.client.ListRecords(ctx, &recordpb.ListRecordsRequest{
		UserId: userID,
		Date:   date,
	})
	if err != nil {
		return nil, err
	}

	result := make([]model.Record, len(resp.GetRecords()))
	for i, pb := range resp.GetRecords() {
		result[i] = records.FromProtoRecord(pb)
	}
	return result, nil
}
