FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive

# Update and install common dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    build-essential \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js build tools
RUN apt-get update && apt-get install -y python3 make g++

# Create workspace directory
RUN mkdir -p /workspace
WORKDIR /workspace

# Copy project files
COPY . /workspace/

# Install project dependencies
RUN npm ci || npm install

# Create non-root user (handle existing node user with UID 1000)
RUN groupadd --gid 1001 vscode 2>/dev/null || true \
    && useradd --uid 1001 --gid vscode --shell /bin/bash --create-home vscode 2>/dev/null || true \
    && mkdir -p /home/vscode/.vscode-server /home/vscode/.vscode-server-insiders

# Ensure vscode user owns the workspace and can write to it
RUN chown -R vscode:vscode /home/vscode \
    && chown -R vscode:vscode /workspace \
    && chmod -R 755 /workspace \
    && mkdir -p /workspace/dist/__tests__/services/devcontainer \
    && mkdir -p /workspace/dist/services/devcontainer/__tests__ \
    && mkdir -p /workspace/dist/services/vscode/__tests__ \
    && mkdir -p /workspace/dist/types \
    && mkdir -p /workspace/dist/utils \
    && chown -R vscode:vscode /workspace/dist \
    && chmod -R 755 /workspace/dist

# Switch to non-root user
USER vscode