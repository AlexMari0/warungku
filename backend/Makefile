.PHONY: dev build test test-integration test-all vet clean docker-build seed-mock rollback-mock-data reset-mock mock-gen

dev:
	go run ./cmd/api

build:
	CGO_ENABLED=0 go build -ldflags="-w -s" -o bin/api ./cmd/api

test:
	go test ./... -v -count=1

test-integration:
	go test ./... -v -count=1 -tags=integration

test-all:
	go test ./... -v -count=1 -tags=integration

vet:
	go vet ./...

clean:
	rm -rf bin/

docker-build:
	docker build -t warungku-api:latest .

seed-mock:
	go run ./cmd/seed -up

rollback-mock-data:
	go run ./cmd/seed -down

reset-mock:
	go run ./cmd/seed -reset

mock-gen:
	go run github.com/vektra/mockery/v2@latest
