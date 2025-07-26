import { ComplexDevContainerGenerator } from '../ComplexDevContainerGenerator';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('ComplexDevContainerGenerator', () => {
  const testProjectPath = '/test/project';
  
  describe('constructor', () => {
    it('should initialize with project type and path', () => {
      const generator = new ComplexDevContainerGenerator('Node.js', testProjectPath);
      expect(generator).toBeInstanceOf(ComplexDevContainerGenerator);
    });

    it('should initialize with dependencies', () => {
      const dependencies = { dependencies: { express: '^4.17.1' } };
      const generator = new ComplexDevContainerGenerator('Node.js', testProjectPath, dependencies);
      expect(generator).toBeInstanceOf(ComplexDevContainerGenerator);
    });
  });

  describe('generateConfig', () => {
    it('should generate config for Node.js project', async () => {
      const generator = new ComplexDevContainerGenerator('Node.js', testProjectPath);
      const config = await generator.generateConfig();

      expect(config.name).toBe('Node.js Development Container (Custom)');
      expect(config.dockerFile).toBe('Dockerfile');
      expect(config.context).toBe('..');
      expect(config.remoteUser).toBe('vscode');
      expect(config.forwardPorts).toEqual([3000, 3001, 8080, 9229]);
      expect(config.containerEnv).toEqual({ NODE_ENV: 'development' });
    });

    it('should generate config for Python project', async () => {
      const generator = new ComplexDevContainerGenerator('Python', testProjectPath);
      const config = await generator.generateConfig();

      expect(config.name).toBe('Python Development Container (Custom)');
      expect(config.forwardPorts).toEqual([5000, 8000, 8080, 5678]);
      expect(config.containerEnv).toEqual({
        PYTHONPATH: '/workspace',
        PYTHONDONTWRITEBYTECODE: '1'
      });
    });

    it('should generate config for Go project', async () => {
      const generator = new ComplexDevContainerGenerator('Go', testProjectPath);
      const config = await generator.generateConfig();

      expect(config.name).toBe('Go Development Container (Custom)');
      expect(config.forwardPorts).toEqual([8080, 2345]);
      expect(config.containerEnv).toEqual({
        GO111MODULE: 'on',
        GOPATH: '/go'
      });
    });

    it('should include VSCode extensions', async () => {
      const generator = new ComplexDevContainerGenerator('TypeScript', testProjectPath);
      const config = await generator.generateConfig();

      expect(config.customizations?.vscode?.extensions).toContain('dbaeumer.vscode-eslint');
      expect(config.customizations?.vscode?.extensions).toContain('esbenp.prettier-vscode');
      expect(config.customizations?.vscode?.extensions).toContain('eamodio.gitlens');
    });

    it('should include Docker socket mount', async () => {
      const generator = new ComplexDevContainerGenerator('Node.js', testProjectPath);
      const config = await generator.generateConfig();

      expect(config.mounts).toContain('source=/var/run/docker.sock,target=/var/run/docker.sock,type=bind');
    });

    it('should include security options', async () => {
      const generator = new ComplexDevContainerGenerator('Python', testProjectPath);
      const config = await generator.generateConfig();

      expect(config.runArgs).toEqual(['--cap-add=SYS_PTRACE', '--security-opt', 'seccomp=unconfined']);
    });
  });

  describe('generateDockerfile', () => {
    it('should generate Dockerfile for Node.js project', async () => {
      const dependencies = {
        dependencies: { express: '^4.17.1' },
        devDependencies: { typescript: '^5.0.0' }
      };
      const generator = new ComplexDevContainerGenerator('Node.js', testProjectPath, dependencies);
      const dockerfile = await generator.generateDockerfile();

      expect(dockerfile).toContain('FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye');
      expect(dockerfile).toContain('ENV DEBIAN_FRONTEND=noninteractive');
      expect(dockerfile).toContain('RUN apt-get update && apt-get install -y');
      expect(dockerfile).toContain('git');
      expect(dockerfile).toContain('curl');
      expect(dockerfile).toContain('# Install Node.js build tools');
      expect(dockerfile).toContain('RUN npm install -g typescript');
      expect(dockerfile).toContain('RUN npm ci || npm install');
      expect(dockerfile).toContain('USER vscode');
    });

    it('should generate Dockerfile for Python project', async () => {
      const dependencies = {
        dependencies: ['numpy', 'pandas', 'pillow']
      };
      const generator = new ComplexDevContainerGenerator('Python', testProjectPath, dependencies);
      const dockerfile = await generator.generateDockerfile();

      expect(dockerfile).toContain('FROM mcr.microsoft.com/devcontainers/python:1-3.11-bullseye');
      expect(dockerfile).toContain('# Install Python development dependencies');
      expect(dockerfile).toContain('python3-pip');
      expect(dockerfile).toContain('python3-venv');
      expect(dockerfile).toContain('RUN pip3 install --upgrade pip setuptools wheel');
      expect(dockerfile).toContain('libatlas-base-dev gfortran');
      expect(dockerfile).toContain('libjpeg-dev libpng-dev');
      expect(dockerfile).toContain('RUN pip install -r requirements.txt || pip install --upgrade pip');
    });

    it('should generate Dockerfile for Go project', async () => {
      const generator = new ComplexDevContainerGenerator('Go', testProjectPath);
      const dockerfile = await generator.generateDockerfile();

      expect(dockerfile).toContain('FROM mcr.microsoft.com/devcontainers/go:1-1.21-bullseye');
      expect(dockerfile).toContain('# Install Go tools');
      expect(dockerfile).toContain('RUN go install golang.org/x/tools/gopls@latest');
      expect(dockerfile).toContain('RUN go install github.com/go-delve/delve/cmd/dlv@latest');
      expect(dockerfile).toContain('RUN go mod download || go mod init app');
    });

    it('should generate Dockerfile for Java Maven project', async () => {
      const generator = new ComplexDevContainerGenerator('Java (Maven)', testProjectPath);
      const dockerfile = await generator.generateDockerfile();

      expect(dockerfile).toContain('FROM mcr.microsoft.com/devcontainers/java:1-17-bullseye');
      expect(dockerfile).toContain('# Ensure Maven is installed');
      expect(dockerfile).toContain('RUN apt-get update && apt-get install -y maven');
      expect(dockerfile).toContain('RUN mvn dependency:resolve || echo "No pom.xml found"');
    });

    it('should generate Dockerfile for Java Gradle project', async () => {
      const generator = new ComplexDevContainerGenerator('Java (Gradle)', testProjectPath);
      const dockerfile = await generator.generateDockerfile();

      expect(dockerfile).toContain('# Install Gradle');
      expect(dockerfile).toContain('gradle-8.2-bin.zip');
      expect(dockerfile).toContain('ENV GRADLE_HOME=/opt/gradle/gradle-8.2');
      expect(dockerfile).toContain('RUN gradle dependencies || echo "No build.gradle found"');
    });

    it('should generate Dockerfile for Rust project', async () => {
      const generator = new ComplexDevContainerGenerator('Rust', testProjectPath);
      const dockerfile = await generator.generateDockerfile();

      expect(dockerfile).toContain('FROM mcr.microsoft.com/devcontainers/rust:1-bullseye');
      expect(dockerfile).toContain('# Install Rust tools');
      expect(dockerfile).toContain('RUN rustup component add rustfmt clippy');
      expect(dockerfile).toContain('RUN cargo install cargo-watch cargo-edit');
      expect(dockerfile).toContain('RUN cargo build || cargo init . --name app');
    });

    it('should generate Dockerfile for Ruby project', async () => {
      const generator = new ComplexDevContainerGenerator('Ruby', testProjectPath);
      const dockerfile = await generator.generateDockerfile();

      expect(dockerfile).toContain('FROM mcr.microsoft.com/devcontainers/ruby:1-3.2-bullseye');
      expect(dockerfile).toContain('# Install Ruby development dependencies');
      expect(dockerfile).toContain('libssl-dev');
      expect(dockerfile).toContain('libyaml-dev');
      expect(dockerfile).toContain('RUN gem install bundler');
      expect(dockerfile).toContain('RUN bundle install || echo "No Gemfile found"');
    });

    it('should generate Dockerfile for PHP project', async () => {
      const generator = new ComplexDevContainerGenerator('PHP', testProjectPath);
      const dockerfile = await generator.generateDockerfile();

      expect(dockerfile).toContain('FROM mcr.microsoft.com/devcontainers/php:1-8.2-bullseye');
      expect(dockerfile).toContain('# Install PHP extensions');
      expect(dockerfile).toContain('libzip-dev');
      expect(dockerfile).toContain('RUN docker-php-ext-install pdo_mysql mysqli zip');
      expect(dockerfile).toContain('COPY --from=composer:latest /usr/bin/composer');
      expect(dockerfile).toContain('RUN composer install || echo "No composer.json found"');
    });

    it('should handle Node.js project with node-gyp dependencies', async () => {
      const dependencies = {
        dependencies: { 'node-sass': '^7.0.0', 'bcrypt': '^5.0.0' }
      };
      const generator = new ComplexDevContainerGenerator('Node.js', testProjectPath, dependencies);
      const dockerfile = await generator.generateDockerfile();

      expect(dockerfile).toContain('RUN npm install -g node-gyp');
    });

    it('should handle Node.js project with Angular CLI', async () => {
      const dependencies = {
        devDependencies: { '@angular/cli': '^15.0.0' }
      };
      const generator = new ComplexDevContainerGenerator('Node.js', testProjectPath, dependencies);
      const dockerfile = await generator.generateDockerfile();

      expect(dockerfile).toContain('RUN npm install -g @angular/cli');
    });

    it('should handle Node.js project with React', async () => {
      const dependencies = {
        dependencies: { 'react-scripts': '^5.0.0' }
      };
      const generator = new ComplexDevContainerGenerator('Node.js', testProjectPath, dependencies);
      const dockerfile = await generator.generateDockerfile();

      expect(dockerfile).toContain('RUN npm install -g create-react-app');
    });
  });

  describe('Dockerfile structure', () => {
    it('should have proper structure with workspace setup', async () => {
      const generator = new ComplexDevContainerGenerator('Node.js', testProjectPath);
      const dockerfile = await generator.generateDockerfile();

      expect(dockerfile).toContain('# Create workspace directory');
      expect(dockerfile).toContain('RUN mkdir -p /workspace');
      expect(dockerfile).toContain('WORKDIR /workspace');
      expect(dockerfile).toContain('# Copy project files');
      expect(dockerfile).toContain('COPY . /workspace/');
    });

    it('should switch to non-root user at the end', async () => {
      const generator = new ComplexDevContainerGenerator('Python', testProjectPath);
      const dockerfile = await generator.generateDockerfile();

      const lines = dockerfile.split('\n');
      const lastNonEmptyLine = lines.filter(l => l.trim()).pop();
      expect(lastNonEmptyLine).toBe('USER vscode');
    });
  });
});