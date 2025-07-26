import { SimpleDevContainerGenerator } from '../../../services/devcontainer/SimpleDevContainerGenerator';
import { DevContainerConfig } from '../../../services/devcontainer/DevContainerGenerator';

describe('SimpleDevContainerGenerator', () => {
  let generator: SimpleDevContainerGenerator;
  const mockProjectPath = '/test/project';

  describe('Node.js projects', () => {
    beforeEach(() => {
      generator = new SimpleDevContainerGenerator('Node.js', mockProjectPath);
    });

    it('should generate correct config for Node.js project', async () => {
      const config = await generator.generateConfig();

      expect(config.name).toBe('Node.js Development Container');
      expect(config.image).toBe('mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye');
      expect(config.remoteUser).toBe('vscode');
      
      // Check features
      expect(config.features).toBeDefined();
      expect(config.features!['ghcr.io/devcontainers/features/common-utils:2']).toBeDefined();
      expect(config.features!['ghcr.io/devcontainers/features/node:1']).toBeDefined();
      expect(config.features!['ghcr.io/devcontainers/features/docker-in-docker:2']).toBeDefined();

      // Check extensions
      const extensions = config.customizations?.vscode?.extensions || [];
      expect(extensions).toContain('dbaeumer.vscode-eslint');
      expect(extensions).toContain('esbenp.prettier-vscode');
      expect(extensions).toContain('christian-kohler.npm-intellisense');

      // Check settings
      const settings = config.customizations?.vscode?.settings || {};
      expect(settings['editor.formatOnSave']).toBe(true);
      expect(settings['eslint.validate']).toContain('javascript');

      // Check ports and commands
      expect(config.forwardPorts).toEqual([3000, 3001, 8080]);
      expect(config.postCreateCommand).toBe('npm install');
    });
  });

  describe('Python projects', () => {
    beforeEach(() => {
      generator = new SimpleDevContainerGenerator('Python', mockProjectPath);
    });

    it('should generate correct config for Python project', async () => {
      const config = await generator.generateConfig();

      expect(config.name).toBe('Python Development Container');
      expect(config.image).toBe('mcr.microsoft.com/devcontainers/python:1-3.11-bullseye');

      // Check Python-specific extensions
      const extensions = config.customizations?.vscode?.extensions || [];
      expect(extensions).toContain('ms-python.python');
      expect(extensions).toContain('ms-python.vscode-pylance');
      expect(extensions).toContain('ms-python.black-formatter');

      // Check Python-specific settings
      const settings = config.customizations?.vscode?.settings || {};
      expect(settings['python.defaultInterpreterPath']).toBe('/usr/local/bin/python');
      expect(settings['python.formatting.provider']).toBe('black');

      // Check ports and commands
      expect(config.forwardPorts).toEqual([5000, 8000, 8080]);
      expect(config.postCreateCommand).toBe('pip install -r requirements.txt || pip install --upgrade pip');
      expect(config.containerEnv).toEqual({ PYTHONPATH: '/workspace' });
    });
  });

  describe('Go projects', () => {
    beforeEach(() => {
      generator = new SimpleDevContainerGenerator('Go', mockProjectPath);
    });

    it('should generate correct config for Go project', async () => {
      const config = await generator.generateConfig();

      expect(config.name).toBe('Go Development Container');
      expect(config.image).toBe('mcr.microsoft.com/devcontainers/go:1-1.21-bullseye');

      // Check Go-specific extensions
      const extensions = config.customizations?.vscode?.extensions || [];
      expect(extensions).toContain('golang.go');

      // Check Go-specific settings
      const settings = config.customizations?.vscode?.settings || {};
      expect(settings['go.useLanguageServer']).toBe(true);
      expect(settings['go.lintOnSave']).toBe('workspace');

      // Check ports and commands
      expect(config.forwardPorts).toEqual([8080]);
      expect(config.postCreateCommand).toBe('go mod download');
      expect(config.containerEnv).toEqual({ GO111MODULE: 'on' });
    });
  });

  describe('Java projects', () => {
    it('should generate correct config for Java Maven project', async () => {
      generator = new SimpleDevContainerGenerator('Java (Maven)', mockProjectPath);
      const config = await generator.generateConfig();

      expect(config.name).toBe('Java (Maven) Development Container');
      expect(config.image).toBe('mcr.microsoft.com/devcontainers/java:1-17-bullseye');

      // Note: Java (Maven) uses "Java" for extension lookup, which isn't in the map
      // So it only gets common extensions
      const extensions = config.customizations?.vscode?.extensions || [];
      expect(extensions.length).toBeGreaterThan(0);
      expect(extensions).toContain('eamodio.gitlens');

      expect(config.forwardPorts).toEqual([8080, 8081]);
      expect(config.postCreateCommand).toBe('mvn dependency:resolve || echo "No Maven project found"');
    });

    it('should generate correct config for Java Gradle project', async () => {
      generator = new SimpleDevContainerGenerator('Java (Gradle)', mockProjectPath);
      const config = await generator.generateConfig();

      expect(config.name).toBe('Java (Gradle) Development Container');
      expect(config.postCreateCommand).toBe('./gradlew dependencies || echo "No Gradle project found"');
    });
  });

  describe('Other languages', () => {
    it('should generate correct config for Rust project', async () => {
      generator = new SimpleDevContainerGenerator('Rust', mockProjectPath);
      const config = await generator.generateConfig();

      expect(config.name).toBe('Rust Development Container');
      expect(config.image).toBe('mcr.microsoft.com/devcontainers/rust:1-bullseye');

      const extensions = config.customizations?.vscode?.extensions || [];
      expect(extensions).toContain('rust-lang.rust-analyzer');
      expect(extensions).toContain('vadimcn.vscode-lldb');

      expect(config.postCreateCommand).toBe('cargo build || cargo init . --name app');
    });

    it('should generate correct config for Ruby project', async () => {
      generator = new SimpleDevContainerGenerator('Ruby', mockProjectPath);
      const config = await generator.generateConfig();

      expect(config.image).toBe('mcr.microsoft.com/devcontainers/ruby:1-3.2-bullseye');
      expect(config.forwardPorts).toEqual([3000, 4567]);
      expect(config.postCreateCommand).toBe('bundle install || gem install bundler');
    });

    it('should generate correct config for PHP project', async () => {
      generator = new SimpleDevContainerGenerator('PHP', mockProjectPath);
      const config = await generator.generateConfig();

      expect(config.image).toBe('mcr.microsoft.com/devcontainers/php:1-8.2-bullseye');
      expect(config.forwardPorts).toEqual([8080, 9000]);
      expect(config.postCreateCommand).toBe('composer install || echo "No composer.json found"');
    });
  });

  describe('Common features', () => {
    it('should include common extensions for all project types', async () => {
      const projectTypes = ['Node.js', 'Python', 'Go', 'Rust'];

      for (const projectType of projectTypes) {
        generator = new SimpleDevContainerGenerator(projectType, mockProjectPath);
        const config = await generator.generateConfig();

        const extensions = config.customizations?.vscode?.extensions || [];
        expect(extensions).toContain('eamodio.gitlens');
        expect(extensions).toContain('ms-vsliveshare.vsliveshare');
        expect(extensions).toContain('streetsidesoftware.code-spell-checker');
      }
    });

    it('should include common features for all project types', async () => {
      generator = new SimpleDevContainerGenerator('Python', mockProjectPath);
      const config = await generator.generateConfig();

      expect(config.features).toBeDefined();
      expect(config.features!['ghcr.io/devcontainers/features/common-utils:2']).toBeDefined();
      const commonUtils = config.features!['ghcr.io/devcontainers/features/common-utils:2'];
      expect(commonUtils.installZsh).toBe(true);
      expect(commonUtils.configureZshAsDefaultShell).toBe(true);
    });

    it('should handle unknown project types with default config', async () => {
      generator = new SimpleDevContainerGenerator('Unknown Language', mockProjectPath);
      const config = await generator.generateConfig();

      expect(config.name).toBe('Unknown Language Development Container');
      expect(config.image).toBe('mcr.microsoft.com/devcontainers/base:bullseye');
      expect(config.forwardPorts).toEqual([8080]);
    });
  });

  describe('TypeScript projects', () => {
    it('should handle TypeScript similarly to Node.js', async () => {
      generator = new SimpleDevContainerGenerator('TypeScript', mockProjectPath);
      const config = await generator.generateConfig();

      expect(config.image).toBe('mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye');
      expect(config.features).toBeDefined();
      expect(config.features!['ghcr.io/devcontainers/features/docker-in-docker:2']).toBeDefined();
      
      const extensions = config.customizations?.vscode?.extensions || [];
      expect(extensions).toContain('ms-vscode.vscode-typescript-next');
    });
  });
});