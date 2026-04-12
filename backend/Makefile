.PHONY: build run test tidy docker docker-run docker-dev clean seed

APP_NAME=server
PACKAGE=./src
SEED_PACKAGE=./cmd/seed

build:
	go build -o bin/$(APP_NAME) $(PACKAGE)

run:
	go run $(PACKAGE)

test:
	go test ./...

tidy:
	go mod tidy

seed:
	go run $(SEED_PACKAGE)

docker:
	docker build -t devverse/backend:latest .

docker-run:
	docker run --rm -p 8080:8080 --env-file .env devverse/backend:latest

docker-dev:
	docker compose up --build

clean:
	rm -rf bin tmp


