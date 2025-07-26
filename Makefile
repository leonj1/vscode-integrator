# Default target
.DEFAULT_GOAL := help

# Variables
IMAGE_NAME := vscode-integrator-test
DOCKER_RUN := docker run --rm -v $(PWD):/app -w /app

.PHONY: help
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: test
test: ## Run tests in Docker container
	@echo "Building test Docker image..."
	@docker build -f Dockerfile.test -t $(IMAGE_NAME) .
	@echo "Running tests..."
	@$(DOCKER_RUN) $(IMAGE_NAME) npm test

.PHONY: test-coverage
test-coverage: ## Run tests with coverage in Docker container
	@echo "Building test Docker image..."
	@docker build -f Dockerfile.test -t $(IMAGE_NAME) .
	@echo "Running tests with coverage..."
	@$(DOCKER_RUN) $(IMAGE_NAME) npm run test:coverage

.PHONY: test-watch
test-watch: ## Run tests in watch mode (interactive)
	@echo "Building test Docker image..."
	@docker build -f Dockerfile.test -t $(IMAGE_NAME) .
	@echo "Running tests in watch mode..."
	@docker run --rm -it -v $(PWD):/app -w /app $(IMAGE_NAME) npm run test:watch

.PHONY: lint
lint: ## Run linting in Docker container
	@echo "Building test Docker image..."
	@docker build -f Dockerfile.test -t $(IMAGE_NAME) .
	@echo "Running linter..."
	@$(DOCKER_RUN) $(IMAGE_NAME) npm run lint

.PHONY: typecheck
typecheck: ## Run type checking in Docker container
	@echo "Building test Docker image..."
	@docker build -f Dockerfile.test -t $(IMAGE_NAME) .
	@echo "Running type check..."
	@$(DOCKER_RUN) $(IMAGE_NAME) npm run typecheck

.PHONY: build
build: ## Build TypeScript to JavaScript
	@echo "Building TypeScript project..."
	@npm run build

.PHONY: build-binary
build-binary: ## Build executable binaries for all platforms
	@echo "Building executable binaries..."
	@mkdir -p binaries
	@npm run build:binary:all
	@echo "Binaries created in ./binaries/"
	@ls -la binaries/

.PHONY: build-binary-linux
build-binary-linux: ## Build Linux executable
	@echo "Building Linux binary..."
	@mkdir -p binaries
	@npm run build:binary:linux
	@echo "Linux binary created: binaries/vscode-integrator-linux"

.PHONY: build-binary-macos
build-binary-macos: ## Build macOS executable
	@echo "Building macOS binary..."
	@mkdir -p binaries
	@npm run build:binary:macos
	@echo "macOS binary created: binaries/vscode-integrator-macos"

.PHONY: build-binary-windows
build-binary-windows: ## Build Windows executable
	@echo "Building Windows binary..."
	@mkdir -p binaries
	@npm run build:binary:windows
	@echo "Windows binary created: binaries/vscode-integrator-win.exe"

.PHONY: build-docker
build-docker: ## Build binaries using Docker (for cross-platform builds)
	@echo "Building binaries in Docker..."
	@docker build -f Dockerfile.build -t vscode-integrator-builder .
	@docker run --rm -v $(PWD)/binaries:/app/binaries vscode-integrator-builder
	@echo "Binaries created in ./binaries/"

.PHONY: clean
clean: ## Clean up generated files and Docker images
	@echo "Cleaning up..."
	@rm -rf dist coverage node_modules binaries
	@docker rmi $(IMAGE_NAME) 2>/dev/null || true
	@docker rmi vscode-integrator-builder 2>/dev/null || true
	@echo "Clean complete"