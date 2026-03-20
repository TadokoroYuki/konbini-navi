# Build stage
FROM public.ecr.aws/docker/library/golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build all microservices
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /service-products ./cmd/products
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /service-records ./cmd/records
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /service-nutrition ./cmd/nutrition
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /service-recommendations ./cmd/recommendations

# Runtime stage
FROM public.ecr.aws/docker/library/alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy all service binaries
COPY --from=builder /service-products /app/products
COPY --from=builder /service-records /app/records
COPY --from=builder /service-nutrition /app/nutrition
COPY --from=builder /service-recommendations /app/recommendations

CMD ["./products"]
