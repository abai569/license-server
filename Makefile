.PHONY: build clean run

BINARY_NAME=license-server
GOOS=$(shell go env GOOS)
GOARCH=$(shell go env GOARCH)

build:
	CGO_ENABLED=0 go build -o $(BINARY_NAME) -ldflags="-s -w" ./cmd

build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o $(BINARY_NAME)-linux-amd64 -ldflags="-s -w" ./cmd
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o $(BINARY_NAME)-linux-arm64 -ldflags="-s -w" ./cmd

run:
	go run ./cmd

clean:
	rm -f $(BINARY_NAME) $(BINARY_NAME)-linux-*

test:
	go test -v ./...
