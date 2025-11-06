# Multi-stage build for Go API
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install build tools
RUN apk add --no-cache ca-certificates git

# Copy go module files first to leverage layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY src ./src

# Build binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /app/bin/server ./src

# Final minimal image
FROM gcr.io/distroless/base-debian12

WORKDIR /app

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/bin/server /app/server

ENV PORT=8080
EXPOSE 8080

USER 65532:65532

ENTRYPOINT ["/app/server"]



