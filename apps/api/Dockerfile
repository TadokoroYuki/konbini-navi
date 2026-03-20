# Build stage
FROM public.ecr.aws/docker/library/golang:1.24-alpine AS builder

ARG SERVICE_NAME

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /service ./cmd/${SERVICE_NAME}

# Runtime stage
FROM public.ecr.aws/docker/library/alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /service .

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${HTTP_PORT:-8080}/health || exit 1

CMD ["./service"]
