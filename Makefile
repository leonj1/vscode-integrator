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
build: ## Build the project in Docker container
	@echo "Building test Docker image..."
	@docker build -f Dockerfile.test -t $(IMAGE_NAME) .
	@echo "Building project..."
	@$(DOCKER_RUN) $(IMAGE_NAME) npm run build

.PHONY: clean
clean: ## Clean up generated files and Docker images
	@echo "Cleaning up..."
	@rm -rf dist coverage node_modules
	@docker rmi $(IMAGE_NAME) 2>/dev/null || true
	@echo "Clean complete"