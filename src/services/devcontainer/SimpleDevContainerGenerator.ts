import { DevContainerGenerator, DevContainerConfig } from './DevContainerGenerator';

export class SimpleDevContainerGenerator extends DevContainerGenerator {
  async generateDockerfile(): Promise<string> {
    // SimpleDevContainerGenerator uses pre-built images with features
    // No custom Dockerfile is needed
    return '';
  }

  async generateConfig(): Promise<DevContainerConfig> {
    const baseImage = this.getBaseImage(this.projectType);
    const languageExtensions = this.getLanguageExtensions(this.projectType);
    const commonExtensions = this.getCommonExtensions();
    const settings = this.getDefaultSettings(this.projectType);
    const features = this.getDefaultFeatures(this.projectType);

    // Remove duplicates from extensions
    const allExtensions = [...new Set([...languageExtensions, ...commonExtensions])];

    const config: DevContainerConfig = {
      name: `${this.projectType} Development Container`,
      image: baseImage,
      features,
      customizations: {
        vscode: {
          extensions: allExtensions,
          settings
        }
      },
      remoteUser: 'vscode'
    };

    // Add project-specific configurations
    this.addProjectSpecificConfig(config);

    return config;
  }

  private addProjectSpecificConfig(config: DevContainerConfig): void {
    switch (this.projectType) {
      case 'Node.js':
      case 'TypeScript':
        config.forwardPorts = [3000, 3001, 8080];
        config.postCreateCommand = 'npm install';
        break;

      case 'Python':
        config.forwardPorts = [5000, 8000, 8080];
        config.postCreateCommand = 'pip install -r requirements.txt || pip install --upgrade pip';
        config.containerEnv = {
          PYTHONPATH: '/workspace'
        };
        break;

      case 'Go':
        config.forwardPorts = [8080];
        config.postCreateCommand = 'go mod download';
        config.containerEnv = {
          GO111MODULE: 'on'
        };
        break;

      case 'Java':
      case 'Java (Maven)':
        config.forwardPorts = [8080, 8081];
        config.postCreateCommand = 'mvn dependency:resolve || echo "No Maven project found"';
        break;

      case 'Java (Gradle)':
        config.forwardPorts = [8080, 8081];
        config.postCreateCommand = './gradlew dependencies || echo "No Gradle project found"';
        break;

      case 'Rust':
        config.forwardPorts = [8080];
        config.postCreateCommand = 'cargo build || cargo init . --name app';
        break;

      case 'Ruby':
        config.forwardPorts = [3000, 4567];
        config.postCreateCommand = 'bundle install || gem install bundler';
        break;

      case 'PHP':
        config.forwardPorts = [8080, 9000];
        config.postCreateCommand = 'composer install || echo "No composer.json found"';
        break;

      case 'C++':
        config.postCreateCommand = 'cmake . || echo "No CMake project"';
        break;

      case 'C#/.NET':
        config.forwardPorts = [5000, 5001];
        config.postCreateCommand = 'dotnet restore || echo "No .NET project found"';
        break;

      default:
        config.forwardPorts = [8080];
        break;
    }

    // Add Docker-in-Docker support for projects that might need it
    if (this.projectType.includes('Node.js') || this.projectType.includes('TypeScript')) {
      config.features = {
        ...config.features,
        'ghcr.io/devcontainers/features/docker-in-docker:2': {
          version: 'latest',
          dockerDashComposeVersion: 'v2'
        }
      };
    }
  }
}
