import { spawn } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

export interface DevContainerCLIOptions {
  workspaceFolder: string;
  additionalArgs?: string[];
  env?: Record<string, string>;
}

export interface DevContainerBuildResult {
  success: boolean;
  output: string;
  error?: string;
  imageName?: string;
}

export interface DevContainerExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class DevContainerCLIService {
  private workspaceFolder: string;

  constructor(workspaceFolder: string) {
    this.workspaceFolder = path.resolve(workspaceFolder);
  }

  /**
   * Build the devcontainer using the bundled devcontainer CLI
   */
  async build(options?: { noCache?: boolean; platform?: string }): Promise<DevContainerBuildResult> {
    const args = ['build', '--workspace-folder', this.workspaceFolder];
    
    if (options?.noCache) {
      args.push('--no-cache');
    }
    
    if (options?.platform) {
      args.push('--platform', options.platform);
    }

    try {
      const result = await this.runDevContainerCommand(args);
      
      // Try to extract image name from output
      const imageMatch = result.stdout.match(/Successfully built ([a-f0-9]+)/);
      const imageName = imageMatch ? imageMatch[1] : undefined;
      
      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.exitCode !== 0 ? result.stderr : undefined,
        imageName,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Start the devcontainer
   */
  async up(options?: { removeExistingContainer?: boolean }): Promise<DevContainerBuildResult> {
    const args = ['up', '--workspace-folder', this.workspaceFolder];
    
    if (options?.removeExistingContainer) {
      args.push('--remove-existing-container');
    }

    try {
      const result = await this.runDevContainerCommand(args);
      
      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.exitCode !== 0 ? result.stderr : undefined,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute a command inside the devcontainer
   */
  async exec(command: string[], options?: { workdir?: string }): Promise<DevContainerExecResult> {
    const args = [
      'exec',
      '--workspace-folder',
      this.workspaceFolder,
    ];
    
    if (options?.workdir) {
      args.push('--workdir', options.workdir);
    }
    
    // Add the command to execute
    args.push(...command);

    try {
      const result = await this.runDevContainerCommand(args);
      
      return {
        success: result.exitCode === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      };
    } catch (error) {
      return {
        success: false,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: -1,
      };
    }
  }

  /**
   * Run user commands (like postCreateCommand)
   */
  async runUserCommands(): Promise<DevContainerExecResult> {
    const args = ['run-user-commands', '--workspace-folder', this.workspaceFolder];

    try {
      const result = await this.runDevContainerCommand(args);
      
      return {
        success: result.exitCode === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      };
    } catch (error) {
      return {
        success: false,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: -1,
      };
    }
  }

  /**
   * Read the devcontainer configuration
   */
  async readConfiguration(): Promise<any> {
    const args = ['read-configuration', '--workspace-folder', this.workspaceFolder];

    try {
      const result = await this.runDevContainerCommand(args);
      
      if (result.exitCode === 0) {
        return JSON.parse(result.stdout);
      } else {
        throw new Error(result.stderr || 'Failed to read configuration');
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Check if devcontainer CLI is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Try to require the CLI module
      require('@devcontainers/cli/dist/spec-node/devContainersSpecCLI.js');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the devcontainer CLI version
   */
  async getVersion(): Promise<string | null> {
    try {
      // Get version from package.json
      const packageJson = require('@devcontainers/cli/package.json');
      return packageJson.version || null;
    } catch {
      return null;
    }
  }

  /**
   * Run a devcontainer command using the bundled CLI
   */
  private async runDevContainerCommand(args: string[]): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      
      // Always use child_process to run the CLI
      // This works both in development and when bundled with pkg
      const devcontainerPath = this.getDevContainerCLIPath();
      
      const child = spawn('node', [devcontainerPath, ...args], {
          env: { ...process.env },
          shell: false,
        });

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          resolve({
            stdout,
            stderr,
            exitCode: code || 0,
          });
        });

      child.on('error', (error) => {
        stderr += error.message;
        resolve({
          stdout,
          stderr,
          exitCode: -1,
        });
      });
    });
  }

  /**
   * Get the path to the devcontainer CLI
   */
  private getDevContainerCLIPath(): string {
    try {
      // First try to resolve the CLI entry point
      return require.resolve('@devcontainers/cli/devcontainer.js');
    } catch {
      // Fallback paths for different environments
      const possiblePaths = [
        path.join(__dirname, '..', '..', 'node_modules', '@devcontainers', 'cli', 'devcontainer.js'),
        path.join(process.cwd(), 'node_modules', '@devcontainers', 'cli', 'devcontainer.js'),
      ];

      for (const possiblePath of possiblePaths) {
        try {
          require(possiblePath);
          return possiblePath;
        } catch {
          // Continue to next path
        }
      }

      // Final fallback
      return possiblePaths[0];
    }
  }

  /**
   * Run a full test cycle: build, up, run tests, and cleanup
   */
  async runFullTest(testCommand: string[] = ['npm', 'test']): Promise<{
    success: boolean;
    buildResult: DevContainerBuildResult;
    upResult?: DevContainerBuildResult;
    testResult?: DevContainerExecResult;
    logs: string[];
  }> {
    const logs: string[] = [];
    
    // Step 1: Build the container
    logs.push('Building devcontainer...');
    const buildResult = await this.build();
    logs.push(`Build ${buildResult.success ? 'succeeded' : 'failed'}`);
    
    if (!buildResult.success) {
      return {
        success: false,
        buildResult,
        logs,
      };
    }

    // Step 2: Start the container
    logs.push('Starting devcontainer...');
    const upResult = await this.up();
    logs.push(`Container startup ${upResult.success ? 'succeeded' : 'failed'}`);
    
    if (!upResult.success) {
      return {
        success: false,
        buildResult,
        upResult,
        logs,
      };
    }

    // Step 3: Run tests
    logs.push(`Running test command: ${testCommand.join(' ')}`);
    const testResult = await this.exec(testCommand);
    logs.push(`Tests ${testResult.success ? 'passed' : 'failed'}`);

    return {
      success: testResult.success,
      buildResult,
      upResult,
      testResult,
      logs,
    };
  }
}