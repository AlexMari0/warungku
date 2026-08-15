.PHONY: dev build test vet clean docker-build

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
