# VS Code Integrator - Binary Distribution

This directory contains pre-compiled executables of VS Code Integrator for different platforms.

## Available Binaries

- `vscode-integrator-linux` - Linux x64
- `vscode-integrator-macos` - macOS Intel (x64)
- `vscode-integrator-macos-arm` - macOS Apple Silicon (ARM64)
- `vscode-integrator-win.exe` - Windows x64

## Usage

No installation required! Just download the appropriate binary for your platform and run it.

### Linux/macOS

Make the binary executable:
```bash
chmod +x vscode-integrator-linux
# or
chmod +x vscode-integrator-macos
```

Run the binary:
```bash
./vscode-integrator-linux analyze --path /path/to/your/project
./vscode-integrator-linux generate --path /path/to/your/project
```

### Windows

Run directly from Command Prompt or PowerShell:
```cmd
vscode-integrator-win.exe analyze --path C:\path\to\your\project
vscode-integrator-win.exe generate --path C:\path\to\your\project
```

## Commands

### Analyze a project
```bash
./vscode-integrator-linux analyze [--path <project-path>]
```

### Generate configurations
```bash
./vscode-integrator-linux generate [options]

Options:
  -p, --path <path>         Project path (defaults to current directory)
  -f, --force              Overwrite existing configurations
  --devcontainer-only      Generate only DevContainer configuration
  --vscode-only            Generate only VS Code configuration
  --validate               Validate the generated configurations
```

## System Requirements

- No Node.js installation required
- Works on:
  - Linux: Ubuntu 18.04+, Debian 10+, CentOS 7+, etc.
  - macOS: 10.13+ (Intel), 11.0+ (Apple Silicon)
  - Windows: Windows 10/11, Server 2016+

## Notes

- These binaries are self-contained and include all necessary dependencies
- File size is larger than the source code because Node.js runtime is bundled
- If you encounter permission issues on Linux/macOS, ensure the binary has execute permissions
- On macOS, you may need to allow the app in System Preferences > Security & Privacy

## Building from Source

If you prefer to build your own binary:

```bash
git clone https://github.com/yourusername/vscode-integrator.git
cd vscode-integrator
npm install
make build-binary
```

## Troubleshooting

### "Permission denied" on Linux/macOS
```bash
chmod +x vscode-integrator-linux
```

### "Cannot be opened because the developer cannot be verified" on macOS
Right-click the binary and select "Open", or go to System Preferences > Security & Privacy and allow the app.

### Binary doesn't run on older systems
The binaries are compiled for Node.js 18. For older systems, build from source with an appropriate Node.js version.