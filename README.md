# VS Code Integrator

An automated tool that generates DevContainer and VS Code configurations for software projects. It analyzes your project, detects the programming languages and frameworks used, and creates optimized development environments.

## Features

- 🔍 **Automatic Project Analysis**
  - Detects programming languages and frameworks
  - Counts lines of code to determine project complexity
  - Identifies Git repositories
  - Analyzes project dependencies

- 🐳 **DevContainer Generation**
  - Creates simple DevContainers for small projects (<1000 lines)
  - Generates custom Dockerfiles for complex projects
  - Configures language-specific tools and extensions
  - Sets up appropriate development features

- ⚙️ **VS Code Configuration**
  - Generates launch.json for debugging
  - Creates tasks.json for build/test operations
  - Configures settings.json with formatters and linters
  - Language-specific optimizations

- ✅ **Configuration Validation**
  - Validates DevContainer setup
  - Tests VS Code integration
  - Provides detailed validation reports

## Supported Languages

- Node.js / TypeScript
- Python
- Go
- Java (Maven & Gradle)
- Rust
- Ruby
- PHP
- C++ / C
- C# / .NET

## Installation

```bash
# Download the latest release
curl -L -o vscode-integrator-linux https://github.com/leonj1/vscode-integrator/releases/latest/download/vscode-integrator-linux

# Make it executable
chmod +x vscode-integrator-linux

# Move to a directory in your PATH (optional)
sudo mv vscode-integrator-linux /usr/local/bin/
```

## Usage

### How to run this

Generate DevContainer and VS Code configurations with validation:

```bash
# If you moved the binary to your PATH
vscode-integrator-linux generate --validate

# Or if running from the current directory
./vscode-integrator-linux generate --validate
```

### Optional force

Force overwrite existing configurations:

```bash
# If you moved the binary to your PATH
vscode-integrator-linux generate --validate --force

# Or if running from the current directory
./vscode-integrator-linux generate --validate --force
```

## Generated Files

### DevContainer Configuration

For simple projects (<1000 lines):
- `.devcontainer/devcontainer.json` - Uses pre-built Microsoft DevContainer images

For complex projects (≥1000 lines):
- `.devcontainer/devcontainer.json` - References custom Dockerfile
- `.devcontainer/Dockerfile` - Custom container with all dependencies

### VS Code Configuration

- `.vscode/launch.json` - Debug configurations
- `.vscode/tasks.json` - Build and test tasks
- `.vscode/settings.json` - Editor settings, formatters, and linters

## Architecture

The project is organized into modular components:

### Core Services

1. **ProjectAnalyzer** - Analyzes project characteristics
   - `detectLanguage()` - Identifies programming languages
   - `countLinesOfCode()` - Counts total lines
   - `isGitRepo()` - Checks for Git repository
   - `getProjectType()` - Determines project type

2. **DependencyAnalyzer** - Parses dependency files
   - Supports package.json, requirements.txt, go.mod, etc.
   - Extracts dependency information
   - Differentiates dev/prod dependencies

### DevContainer Generators

1. **SimpleDevContainerGenerator** - For small projects
   - Uses Microsoft's pre-built images
   - Basic extension configuration
   - Standard development features

2. **ComplexDevContainerGenerator** - For large projects
   - Generates custom Dockerfiles
   - Includes all project dependencies
   - Advanced container configuration

### VS Code Generators

1. **LaunchConfigGenerator** - Debug configurations
2. **TasksConfigGenerator** - Build/test tasks
3. **SettingsConfigGenerator** - Editor settings

### Validators

1. **DevContainerValidator** - Validates DevContainer setup
2. **VSCodeIntegrationValidator** - Tests VS Code configurations

## Development

### Building

```bash
make build
```

### Running Tests

```bash
make test
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run typecheck
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Microsoft for the excellent DevContainer specification
- The VS Code team for their extensible editor platform
- All contributors to the various language-specific DevContainer features
