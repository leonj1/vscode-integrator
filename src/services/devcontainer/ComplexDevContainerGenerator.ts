import { DevContainerGenerator, DevContainerConfig, DockerfileContent } from './DevContainerGenerator';
import * as path from 'path';

export class ComplexDevContainerGenerator extends DevContainerGenerator {
  private dependencies: Record<string, any> = {};

  constructor(projectType: string, projectPath: string = process.cwd(), dependencies: Record<string, any> = {}) {
    super(projectType, projectPath);
    this.dependencies = dependencies;
  }

  async generateConfig(): Promise<DevContainerConfig> {
    const languageExtensions = this.getLanguageExtensions(this.projectType);
    const commonExtensions = this.getCommonExtensions();
    const settings = this.getDefaultSettings(this.projectType);

    // Remove duplicates from extensions
    const allExtensions = [...new Set([...languageExtensions, ...commonExtensions])];

    const config: DevContainerConfig = {
      name: `${this.projectType} Development Container (Custom)`,
      dockerFile: 'Dockerfile',
      context: '.',
      customizations: {
        vscode: {
          extensions: allExtensions,
          settings
        }
      },
      remoteUser: 'vscode',
      mounts: [
        'source=${localWorkspaceFolder}/,target=/workspace,type=bind,consistency=cached'
      ]
    };

    // Add project-specific configurations
    this.addProjectSpecificConfig(config);

    return config;
  }

  async generateDockerfile(): Promise<string> {
    const dockerfileContent = this.createDockerfileContent();
    return this.buildDockerfile(dockerfileContent);
  }

  private createDockerfileContent(): DockerfileContent {
    const baseImage = this.getBaseImage(this.projectType);
    const instructions: string[] = [];

    // Add common instructions
    instructions.push('# Update and install common dependencies');
    instructions.push('RUN apt-get update && apt-get install -y \\');
    instructions.push('    git \\');
    instructions.push('    curl \\');
    instructions.push('    wget \\');
    instructions.push('    build-essential \\');
    instructions.push('    software-properties-common \\');
    instructions.push('    && rm -rf /var/lib/apt/lists/*');
    instructions.push('');

    // Add language-specific instructions
    switch (this.projectType) {
      case 'Node.js':
      case 'TypeScript':
        instructions.push(...this.getNodeDockerInstructions());
        break;
      case 'Python':
        instructions.push(...this.getPythonDockerInstructions());
        break;
      case 'Go':
        instructions.push(...this.getGoDockerInstructions());
        break;
      case 'Java':
      case 'Java (Maven)':
      case 'Java (Gradle)':
        instructions.push(...this.getJavaDockerInstructions());
        break;
      case 'Rust':
        instructions.push(...this.getRustDockerInstructions());
        break;
      case 'Ruby':
        instructions.push(...this.getRubyDockerInstructions());
        break;
      case 'PHP':
        instructions.push(...this.getPhpDockerInstructions());
        break;
    }

    // Add workspace setup
    instructions.push('');
    instructions.push('# Create workspace directory');
    instructions.push('RUN mkdir -p /workspace');
    instructions.push('WORKDIR /workspace');
    instructions.push('');
    instructions.push('# Copy project files');
    instructions.push('COPY . /workspace/');
    instructions.push('');
    instructions.push('# Install project dependencies');
    instructions.push(...this.getInstallDependenciesInstructions());

    return { baseImage, instructions };
  }

  private buildDockerfile(content: DockerfileContent): string {
    const lines: string[] = [];

    lines.push(`FROM ${content.baseImage}`);
    lines.push('');
    lines.push('# Set environment variables');
    lines.push('ENV DEBIAN_FRONTEND=noninteractive');
    lines.push('');

    lines.push(...content.instructions);

    // Always ensure vscode user exists (safe to run even if user already exists)
    lines.push('');
    lines.push('# Create non-root user (safe to run even if user exists)');
    lines.push('RUN groupadd --gid 1000 vscode 2>/dev/null || true \\');
    lines.push('    && useradd --uid 1000 --gid vscode --shell /bin/bash --create-home vscode 2>/dev/null || true \\');
    lines.push('    && mkdir -p /home/vscode/.vscode-server /home/vscode/.vscode-server-insiders \\');
    lines.push('    && chown -R vscode:vscode /home/vscode /workspace 2>/dev/null || true');
    lines.push('');
    lines.push('# Switch to non-root user');
    lines.push('USER vscode');

    return lines.join('\n');
  }

  private getNodeDockerInstructions(): string[] {
    const instructions: string[] = [];

    instructions.push('# Install Node.js build tools');
    instructions.push('RUN apt-get update && apt-get install -y python3 make g++');

    if (this.dependencies.dependencies || this.dependencies.devDependencies) {
      instructions.push('');
      instructions.push('# Install global npm packages');
      instructions.push('RUN npm install -g npm@latest');

      // Check for common build tools in dependencies
      const allDeps = { ...this.dependencies.dependencies, ...this.dependencies.devDependencies };
      if (allDeps['node-gyp'] || allDeps['node-sass'] || allDeps['bcrypt']) {
        instructions.push('RUN npm install -g node-gyp');
      }

      if (allDeps['typescript']) {
        instructions.push('RUN npm install -g typescript');
      }

      if (allDeps['@angular/cli']) {
        instructions.push('RUN npm install -g @angular/cli');
      }

      if (allDeps['react-scripts']) {
        instructions.push('RUN npm install -g create-react-app');
      }
    }

    return instructions;
  }

  private getPythonDockerInstructions(): string[] {
    const instructions: string[] = [];

    instructions.push('# Install Python development dependencies');
    instructions.push('RUN apt-get update && apt-get install -y \\');
    instructions.push('    python3-dev \\');
    instructions.push('    python3-pip \\');
    instructions.push('    python3-venv \\');
    instructions.push('    libpq-dev \\');
    instructions.push('    libmysqlclient-dev');

    instructions.push('');
    instructions.push('# Upgrade pip');
    instructions.push('RUN pip3 install --upgrade pip setuptools wheel');

    if (this.dependencies.dependencies) {
      // Check for common Python packages that need system dependencies
      if (this.dependencies.dependencies.includes('numpy') ||
          this.dependencies.dependencies.includes('pandas') ||
          this.dependencies.dependencies.includes('scipy')) {
        instructions.push('RUN apt-get update && apt-get install -y libatlas-base-dev gfortran');
      }

      if (this.dependencies.dependencies.includes('pillow')) {
        instructions.push('RUN apt-get update && apt-get install -y libjpeg-dev libpng-dev');
      }
    }

    return instructions;
  }

  private getGoDockerInstructions(): string[] {
    const instructions: string[] = [];

    instructions.push('# Install Go tools');
    instructions.push('RUN go install golang.org/x/tools/gopls@latest');
    instructions.push('RUN go install github.com/go-delve/delve/cmd/dlv@latest');
    instructions.push('RUN go install honnef.co/go/tools/cmd/staticcheck@latest');

    return instructions;
  }

  private getJavaDockerInstructions(): string[] {
    const instructions: string[] = [];

    if (this.projectType.includes('Maven')) {
      instructions.push('# Ensure Maven is installed');
      instructions.push('RUN apt-get update && apt-get install -y maven');
    } else if (this.projectType.includes('Gradle')) {
      instructions.push('# Install Gradle');
      instructions.push('RUN wget https://services.gradle.org/distributions/gradle-8.2-bin.zip -P /tmp');
      instructions.push('RUN unzip -d /opt/gradle /tmp/gradle-*.zip');
      instructions.push('ENV GRADLE_HOME=/opt/gradle/gradle-8.2');
      instructions.push('ENV PATH=${GRADLE_HOME}/bin:${PATH}');
    }

    return instructions;
  }

  private getRustDockerInstructions(): string[] {
    const instructions: string[] = [];

    instructions.push('# Install Rust tools');
    instructions.push('RUN rustup component add rustfmt clippy rust-analysis rust-src');
    instructions.push('RUN cargo install cargo-watch cargo-edit');

    return instructions;
  }

  private getRubyDockerInstructions(): string[] {
    const instructions: string[] = [];

    instructions.push('# Install Ruby development dependencies');
    instructions.push('RUN apt-get update && apt-get install -y \\');
    instructions.push('    libssl-dev \\');
    instructions.push('    libreadline-dev \\');
    instructions.push('    zlib1g-dev \\');
    instructions.push('    libyaml-dev \\');
    instructions.push('    libxml2-dev \\');
    instructions.push('    libxslt1-dev \\');
    instructions.push('    libcurl4-openssl-dev \\');
    instructions.push('    libffi-dev');

    instructions.push('');
    instructions.push('# Install bundler');
    instructions.push('RUN gem install bundler');

    return instructions;
  }

  private getPhpDockerInstructions(): string[] {
    const instructions: string[] = [];

    instructions.push('# Install PHP extensions');
    instructions.push('RUN apt-get update && apt-get install -y \\');
    instructions.push('    libzip-dev \\');
    instructions.push('    libonig-dev \\');
    instructions.push('    libxml2-dev');
    instructions.push('');
    instructions.push('RUN docker-php-ext-install pdo_mysql mysqli zip');

    instructions.push('');
    instructions.push('# Install Composer');
    instructions.push('COPY --from=composer:latest /usr/bin/composer /usr/bin/composer');

    return instructions;
  }

  private getInstallDependenciesInstructions(): string[] {
    const instructions: string[] = [];

    switch (this.projectType) {
      case 'Node.js':
      case 'TypeScript':
        instructions.push('RUN npm ci || npm install');
        break;
      case 'Python':
        instructions.push('RUN pip install -r requirements.txt || pip install --upgrade pip');
        break;
      case 'Go':
        instructions.push('RUN go mod download || go mod init app');
        break;
      case 'Java (Maven)':
        instructions.push('RUN mvn dependency:resolve || echo "No pom.xml found"');
        break;
      case 'Java (Gradle)':
        instructions.push('RUN gradle dependencies || echo "No build.gradle found"');
        break;
      case 'Rust':
        instructions.push('RUN cargo build || cargo init . --name app');
        break;
      case 'Ruby':
        instructions.push('RUN bundle install || echo "No Gemfile found"');
        break;
      case 'PHP':
        instructions.push('RUN composer install || echo "No composer.json found"');
        break;
    }

    return instructions;
  }

  private addProjectSpecificConfig(config: DevContainerConfig): void {
    // Similar to SimpleDevContainerGenerator but with more advanced options
    switch (this.projectType) {
      case 'Node.js':
      case 'TypeScript':
        config.forwardPorts = [3000, 3001, 8080, 9229]; // Include debugger port
        config.containerEnv = {
          NODE_ENV: 'development'
        };
        break;

      case 'Python':
        config.forwardPorts = [5000, 8000, 8080, 5678]; // Include debugger port
        config.containerEnv = {
          PYTHONPATH: '/workspace',
          PYTHONDONTWRITEBYTECODE: '1'
        };
        break;

      case 'Go':
        config.forwardPorts = [8080, 2345]; // Include delve debugger port
        config.containerEnv = {
          GO111MODULE: 'on',
          GOPATH: '/go'
        };
        break;

      default:
        config.forwardPorts = [8080];
        break;
    }

    // Add Docker-in-Docker support
    config.runArgs = ['--cap-add=SYS_PTRACE', '--security-opt', 'seccomp=unconfined'];

    // Add volume mounts for better performance
    config.mounts = [
      ...(config.mounts || []),
      'source=/var/run/docker.sock,target=/var/run/docker.sock,type=bind'
    ];
  }
}
