# Release Process

This project uses automated semantic versioning and releases through GitHub Actions.

## How It Works

When you push to the `master` branch, the GitHub Action will:

1. Analyze your commit messages to determine the version bump
2. Generate a new semantic version tag (e.g., v1.2.3)
3. Build binaries for all supported platforms
4. Create a GitHub Release with the binaries as assets

## Commit Message Format

The semantic versioning is determined by your commit messages:

### Patch Version (v1.0.0 → v1.0.1)
- Default behavior for regular commits
- Bug fixes and small changes
- Examples:
  ```
  fix: resolve issue with file parsing
  docs: update README
  refactor: clean up code structure
  ```

### Minor Version (v1.0.0 → v1.1.0)
- New features that don't break existing functionality
- Use `feat:` prefix or include `#minor` in commit message
- Examples:
  ```
  feat: add new configuration option
  feat: implement new validation rules
  Add support for custom templates #minor
  ```

### Major Version (v1.0.0 → v2.0.0)
- Breaking changes
- Use `BREAKING CHANGE:` in commit body or include `#major` in commit message
- Examples:
  ```
  feat: redesign API interface

  BREAKING CHANGE: The configuration format has changed
  ```
  ```
  Refactor core architecture #major
  ```

## Generated Artifacts

Each release includes binaries for:
- Linux (x64): `vscode-integrator-linux`
- macOS (x64): `vscode-integrator-macos`
- macOS (ARM64): `vscode-integrator-macos-arm`
- Windows (x64): `vscode-integrator-win.exe`

## Manual Release

If you need to create a release manually or skip the automated process, you can:

1. Create and push a tag manually:
   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```

2. The workflow will still run and create the release with binaries.

## Testing the Workflow Locally

Before pushing to master, you can test the GitHub Actions workflow locally using `act` in a Docker container. This project includes a complete testing setup:

### Quick Test

Run the test script to validate your workflow:

```bash
./scripts/test-actions.sh
```

This will:
1. Build a Docker image with `act` and all dependencies
2. Run the workflow in dry-run mode (simulates without actual execution)
3. Show you any issues before you push to master

### Manual Testing

You can also run the tests manually:

```bash
# Build the act runner image
docker build -t vscode-integrator-act-runner -f Dockerfile.act --dockerignore .dockerignore.act .

# Test the push event (list jobs)
docker run --rm \
    --user "$(id -u):$(id -g)" \
    --group-add "$(stat -c '%g' /var/run/docker.sock)" \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "$(pwd)":/app \
    -w /app \
    vscode-integrator-act-runner \
    push --container-options "--user $(id -u):$(id -g) -e NPM_CONFIG_CACHE=/tmp/.npm -e RUNNER_TOOL_CACHE=/opt/hostedtoolcache" --list

# Test without dry-run (actually executes, but won't push to GitHub)
docker run --rm \
    --user "$(id -u):$(id -g)" \
    --group-add "$(stat -c '%g' /var/run/docker.sock)" \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "$(pwd)":/app \
    -w /app \
    vscode-integrator-act-runner \
    push --container-options "--user $(id -u):$(id -g) -e NPM_CONFIG_CACHE=/tmp/.npm -e RUNNER_TOOL_CACHE=/opt/hostedtoolcache"
```

### What Gets Tested

The local testing will validate:
- Workflow syntax and structure
- Job dependencies and execution order
- Environment setup (Node.js, dependencies)
- Build process (TypeScript compilation, binary generation)
- Script execution

**Note:** Local testing won't actually create GitHub releases or push tags, but it will validate that all steps execute successfully. The workflow will fail at the "Generate semantic version and tag" step due to missing GitHub token, which is expected behavior in local testing.

### Test Results

When you run the local test, you should see:
- ✅ Checkout code
- ✅ Setup Node.js environment
- ✅ Install dependencies
- ✅ Run all tests (should pass)
- ✅ Build TypeScript
- ❌ Generate semantic version (fails due to missing GitHub token - expected)

If all steps before the semantic versioning pass, your workflow is ready for production!

## Troubleshooting

- Ensure all tests pass before pushing to master
- The workflow requires the `GITHUB_TOKEN` which is automatically provided by GitHub Actions
- If the workflow fails, check the Actions tab in your GitHub repository for detailed logs
- For local testing issues, ensure Docker is running and you have sufficient disk space
- If `act` fails to pull images, you may need to run `docker pull` for the required base images
