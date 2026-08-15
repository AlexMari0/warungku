.PHONY: dev build test vet clean docker-build seed-mock rollback-mock-data reset-mock

dev:
	go run ./cmd/api

build:
	CGO_ENABLED=0 go build -ldflags="-w -s" -o bin/api ./cmd/api

test:
	go test ./... -v -count=1

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
