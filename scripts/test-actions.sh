#!/bin/bash

# Script to test GitHub Actions locally using act in Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Build the act runner image
print_status "Building act runner Docker image..."
# Copy the dockerignore file to the standard location temporarily
cp .dockerignore.act .dockerignore.tmp
docker build -t vscode-integrator-act-runner -f Dockerfile.act .
# Clean up temporary file
rm -f .dockerignore.tmp

if [ $? -eq 0 ]; then
    print_status "Docker image built successfully!"
else
    print_error "Failed to build Docker image"
    exit 1
fi

# Default event type
EVENT_TYPE=${1:-push}

print_status "Testing GitHub Actions workflow for event: $EVENT_TYPE"
print_warning "This will simulate the workflow but won't actually create releases or push tags"

# Get docker group ID
DOCKER_GID=$(stat -c '%g' /var/run/docker.sock)

# Run act in the container
print_status "Running act..."
docker run --rm \
    --user "$(id -u):$(id -g)" \
    --group-add "$DOCKER_GID" \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "$(pwd)":/app \
    -w /app \
    vscode-integrator-act-runner \
    "$EVENT_TYPE" \
    --container-options "--user $(id -u):$(id -g) -e NPM_CONFIG_CACHE=/tmp/.npm -e RUNNER_TOOL_CACHE=/opt/hostedtoolcache" \
    --list

print_status "Act test completed!"
print_status ""
print_status "To run without dry-run mode (will actually execute actions):"
print_status "docker run --rm --user \"\$(id -u):\$(id -g)\" --group-add \"\$(stat -c '%g' /var/run/docker.sock)\" -v /var/run/docker.sock:/var/run/docker.sock -v \"\$(pwd)\":/app -w /app vscode-integrator-act-runner $EVENT_TYPE --container-options \"--user \$(id -u):\$(id -g) -e NPM_CONFIG_CACHE=/tmp/.npm -e RUNNER_TOOL_CACHE=/opt/hostedtoolcache\""
