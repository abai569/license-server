.PHONY: build clean run

BINARY_NAME=license-server
VERSION=$(shell git describe --tags --always --abbrev=0 2>/dev/null || echo "v1.0.14")
GOOS=$(shell go env GOOS)
GOARCH=$(shell go env GOARCH)

build:
	CGO_ENABLED=0 go build -o $(BINARY_NAME) -ldflags="-s -w -X main.Version=$(VERSION) -X main.GitCommit=$$(git rev-parse --short HEAD) -X main.BuildTime=$$(date +%Y%m%d)" ./cmd

build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o $(BINARY_NAME)-linux-amd64 -ldflags="-s -w -X main.Version=$(VERSION) -X main.GitCommit=$$(git rev-parse --short HEAD) -X main.BuildTime=$$(date +%Y%m%d)" ./cmd
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o $(BINARY_NAME)-linux-arm64 -ldflags="-s -w -X main.Version=$(VERSION) -X main.GitCommit=$$(git rev-parse --short HEAD) -X main.BuildTime=$$(date +%Y%m%d)" ./cmd

run:
	go run ./cmd

clean:
	rm -f $(BINARY_NAME) $(BINARY_NAME)-linux-*

test:
	go test -v ./...
