.PHONY: build run test tidy docker docker-run docker-dev clean

APP_NAME=server
PACKAGE=./src

build:
	go build -o bin/$(APP_NAME) $(PACKAGE)

run:
	go run $(PACKAGE)

test:
	go test ./...

tidy:
	go mod tidy

docker:
	docker build -t devverse/backend:latest .

docker-run:
	docker run --rm -p 8080:8080 --env-file .env devverse/backend:latest

docker-dev:
	docker compose up --build

clean:
	rm -rf bin tmp


