export interface DevContainerConfig {
  name: string;
  image?: string;
  dockerFile?: string;
  context?: string;
  features?: Record<string, any>;
  customizations?: {
    vscode?: {
      extensions?: string[];
      settings?: Record<string, any>;
    };
  };
  forwardPorts?: number[];
  postCreateCommand?: string | string[];
  remoteUser?: string;
  mounts?: string[];
  runArgs?: string[];
  containerEnv?: Record<string, string>;
}

export interface DockerfileContent {
  baseImage: string;
  instructions: string[];
}

export abstract class DevContainerGenerator {
  protected projectType: string;
  protected projectPath: string;

  constructor(projectType: string, projectPath: string = process.cwd()) {
    this.projectType = projectType;
    this.projectPath = projectPath;
  }

  abstract generateConfig(): Promise<DevContainerConfig>;
  abstract generateDockerfile(): Promise<string>;

  protected getCommonExtensions(): string[] {
    return [
      'dbaeumer.vscode-eslint',
      'esbenp.prettier-vscode',
      'eamodio.gitlens',
      'ms-vsliveshare.vsliveshare',
      'streetsidesoftware.code-spell-checker'
    ];
  }

  protected getLanguageExtensions(language: string): string[] {
    const extensionMap: Record<string, string[]> = {
      'Node.js': [
        'dbaeumer.vscode-eslint',
        'esbenp.prettier-vscode',
        'christian-kohler.npm-intellisense',
        'eg2.vscode-npm-script',
        'ms-vscode.js-debug'
      ],
      'TypeScript': [
        'dbaeumer.vscode-eslint',
        'esbenp.prettier-vscode',
        'christian-kohler.npm-intellisense',
        'eg2.vscode-npm-script',
        'ms-vscode.vscode-typescript-next'
      ],
      'Python': [
        'ms-python.python',
        'ms-python.vscode-pylance',
        'ms-python.black-formatter',
        'ms-python.isort',
        'ms-python.flake8'
      ],
      'Go': [
        'golang.go'
      ],
      'Java': [
        'vscjava.vscode-java-pack',
        'redhat.java',
        'vscjava.vscode-java-debug',
        'vscjava.vscode-maven'
      ],
      'Rust': [
        'rust-lang.rust-analyzer',
        'vadimcn.vscode-lldb',
        'serayuzgur.crates'
      ],
      'C++': [
        'ms-vscode.cpptools',
        'ms-vscode.cmake-tools'
      ],
      'C#': [
        'ms-dotnettools.csharp',
        'ms-dotnettools.vscode-dotnet-runtime'
      ],
      'Ruby': [
        'rebornix.ruby',
        'castwide.solargraph',
        'kaiwood.endwise'
      ],
      'PHP': [
        'bmewburn.vscode-intelephense-client',
        'neilbrayfield.php-docblocker',
        'junstyle.php-cs-fixer'
      ]
    };

    return extensionMap[language] || [];
  }

  protected getDefaultSettings(language: string): Record<string, any> {
    const settingsMap: Record<string, Record<string, any>> = {
      'Node.js': {
        'editor.defaultFormatter': 'esbenp.prettier-vscode',
        'editor.formatOnSave': true,
        'eslint.validate': ['javascript', 'javascriptreact', 'typescript', 'typescriptreact']
      },
      'TypeScript': {
        'editor.defaultFormatter': 'esbenp.prettier-vscode',
        'editor.formatOnSave': true,
        'typescript.updateImportsOnFileMove.enabled': 'always',
        'eslint.validate': ['javascript', 'javascriptreact', 'typescript', 'typescriptreact']
      },
      'Python': {
        'python.defaultInterpreterPath': '/usr/local/bin/python',
        'python.linting.enabled': true,
        'python.linting.pylintEnabled': true,
        'python.formatting.provider': 'black',
        'editor.formatOnSave': true
      },
      'Go': {
        'go.toolsManagement.checkForUpdates': 'local',
        'go.useLanguageServer': true,
        'go.lintOnSave': 'workspace',
        'editor.formatOnSave': true
      },
      'Java': {
        'java.server.launchMode': 'Standard',
        'java.compile.nullAnalysis.mode': 'automatic',
        'editor.formatOnSave': true
      },
      'Rust': {
        'rust-analyzer.checkOnSave.command': 'clippy',
        'editor.formatOnSave': true
      }
    };

    return settingsMap[language] || { 'editor.formatOnSave': true };
  }

  protected getBaseImage(projectType: string): string {
    const imageMap: Record<string, string> = {
      'Node.js': 'mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye',
      'TypeScript': 'mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye',
      'Python': 'mcr.microsoft.com/devcontainers/python:1-3.11-bullseye',
      'Go': 'mcr.microsoft.com/devcontainers/go:1-1.21-bullseye',
      'Java': 'mcr.microsoft.com/devcontainers/java:1-17-bullseye',
      'Java (Maven)': 'mcr.microsoft.com/devcontainers/java:1-17-bullseye',
      'Java (Gradle)': 'mcr.microsoft.com/devcontainers/java:1-17-bullseye',
      'Rust': 'mcr.microsoft.com/devcontainers/rust:1-bullseye',
      'C++': 'mcr.microsoft.com/devcontainers/cpp:1-debian-11',
      'C#/.NET': 'mcr.microsoft.com/devcontainers/dotnet:1-7.0-bullseye',
      'Ruby': 'mcr.microsoft.com/devcontainers/ruby:1-3.2-bullseye',
      'PHP': 'mcr.microsoft.com/devcontainers/php:1-8.2-bullseye'
    };

    return imageMap[projectType] || 'mcr.microsoft.com/devcontainers/base:bullseye';
  }

  protected getDefaultFeatures(projectType: string): Record<string, any> {
    const commonFeatures = {
      'ghcr.io/devcontainers/features/common-utils:2': {
        installZsh: true,
        configureZshAsDefaultShell: true,
        installOhMyZsh: true,
        upgradePackages: true
      }
    };

    const languageFeatures: Record<string, Record<string, any>> = {
      'Node.js': {
        'ghcr.io/devcontainers/features/node:1': {
          version: 'lts'
        }
      },
      'Python': {
        'ghcr.io/devcontainers/features/python:1': {
          version: '3.11'
        }
      },
      'Go': {
        'ghcr.io/devcontainers/features/go:1': {
          version: '1.21'
        }
      },
      'Docker': {
        'ghcr.io/devcontainers/features/docker-in-docker:2': {
          version: 'latest',
          dockerDashComposeVersion: 'v2'
        }
      }
    };

    return {
      ...commonFeatures,
      ...(languageFeatures[projectType] || {})
    };
  }
}
