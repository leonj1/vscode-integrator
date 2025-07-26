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