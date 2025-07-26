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
# Clone the repository
git clone https://github.com/yourusername/vscode-integrator.git
cd vscode-integrator

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (optional)
npm link
```

## Usage

### Analyze a Project

Analyze a project without generating any configurations:

```bash
node dist/index.js analyze [--path <project-path>]
```

Example output:
```
📊 Project Analysis for: /path/to/project

🏷️  Project Type: Node.js

📝 Languages Detected:
   - TypeScript: 45 files
   - JavaScript: 12 files

📏 Total Lines of Code: 3,245

🔗 Git Repository: Yes
```

### Generate Configurations

Generate both DevContainer and VS Code configurations:

```bash
node dist/index.js generate [options]
```

Options:
- `-p, --path <path>` - Project path (defaults to current directory)
- `-f, --force` - Overwrite existing configurations
- `--devcontainer-only` - Generate only DevContainer configuration
- `--vscode-only` - Generate only VS Code configuration
- `--validate` - Validate the generated configurations

Example:
```bash
# Generate configurations for current directory
node dist/index.js generate

# Generate for a specific project with validation
node dist/index.js generate --path ./my-project --validate

# Force overwrite existing configurations
node dist/index.js generate --force
```

### Test DevContainer (CLI-only)

Test the devcontainer setup using the bundled devcontainer CLI:

```bash
node dist/index.js test-devcontainer [options]
```

Options:
- `-p, --path <path>` - Project path (defaults to current directory)
- `--build-only` - Only build the container without running tests
- `--no-cache` - Build without using cache
- `--exec <command>` - Execute a specific command in the container
- `--test-command <command>` - Custom test command (default: npm test)

Examples:
```bash
# Test devcontainer in current directory
node dist/index.js test-devcontainer

# Build only without running tests
node dist/index.js test-devcontainer --build-only

# Execute a custom command in the container
node dist/index.js test-devcontainer --exec "node --version"

# Run with custom test command
node dist/index.js test-devcontainer --test-command "npm run test:coverage"

# Build without cache
node dist/index.js test-devcontainer --no-cache
```

This command uses the bundled `@devcontainers/cli` to:
1. Build the devcontainer image
2. Start the container
3. Run tests or execute commands inside the container
4. Report results

No additional tools or VS Code installation required!

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
npm run build
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
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