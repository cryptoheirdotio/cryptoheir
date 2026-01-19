.PHONY: all build build-static build-contracts clean help

# Binary name
BINARY_NAME=cryptoheir

# Build directory
BUILD_DIR=.

# Go build flags
GODEBUG_FLAGS=GODEBUG=embedfollowsymlinks=1
LDFLAGS=-ldflags="-s -w"

all: build-contracts build

build:
	@echo "Building $(BINARY_NAME)..."
	$(GODEBUG_FLAGS) go build -o $(BINARY_NAME) ./cmd/cryptoheir
	@echo "Build complete: $(BINARY_NAME)"

build-static:
	@echo "Building static $(BINARY_NAME)..."
	CGO_ENABLED=0 $(GODEBUG_FLAGS) go build $(LDFLAGS) -o $(BINARY_NAME) ./cmd/cryptoheir
	@echo "Static build complete: $(BINARY_NAME)"

build-contracts:
	@echo "Building Foundry contracts..."
	cd ../foundry && forge build
	@echo "Contracts built successfully"

clean:
	@echo "Cleaning up..."
	rm -f $(BINARY_NAME)
	@echo "Clean complete"

help:
	@echo "Available targets:"
	@echo "  all            - Build contracts and then Go binary (default)"
	@echo "  build          - Build the Go binary"
	@echo "  build-static   - Build static binary with optimizations"
	@echo "  build-contracts- Build Foundry smart contracts"
	@echo "  clean          - Remove built binaries"
	@echo "  help           - Show this help message"
