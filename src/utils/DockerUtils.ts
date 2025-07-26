import { spawn, SpawnOptions } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface DockerCommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class DockerUtils {
  /**
   * Check if Docker is installed and available
   */
  static async isDockerAvailable(): Promise<boolean> {
    try {
      const result = await this.runDockerCommand(['--version']);
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Run a Docker command with arguments
   */
  static async runDockerCommand(
    args: string[],
    options?: SpawnOptions
  ): Promise<DockerCommandResult> {
    return new Promise((resolve) => {
      const docker = spawn('docker', args, {
        ...options,
        shell: false,
      });

      let stdout = '';
      let stderr = '';

      docker.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      docker.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      docker.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
        });
      });

      docker.on('error', (error) => {
        resolve({
          success: false,
          stdout: '',
          stderr: error.message,
          exitCode: -1,
        });
      });
    });
  }

  /**
   * Build a Docker image from a Dockerfile
   */
  static async buildImage(
    dockerfilePath: string,
    imageName: string,
    buildContext?: string,
    buildArgs?: Record<string, string>
  ): Promise<DockerCommandResult> {
    const args = ['build'];
    
    // Add build arguments
    if (buildArgs) {
      Object.entries(buildArgs).forEach(([key, value]) => {
        args.push('--build-arg', `${key}=${value}`);
      });
    }

    // Add tag
    args.push('-t', imageName);

    // Add Dockerfile path
    args.push('-f', dockerfilePath);

    // Add build context (default to directory of Dockerfile)
    const context = buildContext || path.dirname(dockerfilePath);
    args.push(context);

    return this.runDockerCommand(args);
  }

  /**
   * Run a command inside a Docker container
   */
  static async runInContainer(
    imageName: string,
    command: string[],
    options?: {
      workdir?: string;
      env?: Record<string, string>;
      volumes?: string[];
      user?: string;
    }
  ): Promise<DockerCommandResult> {
    const args = ['run', '--rm'];

    // Add working directory
    if (options?.workdir) {
      args.push('-w', options.workdir);
    }

    // Add environment variables
    if (options?.env) {
      Object.entries(options.env).forEach(([key, value]) => {
        args.push('-e', `${key}=${value}`);
      });
    }

    // Add volume mounts
    if (options?.volumes) {
      options.volumes.forEach((volume) => {
        args.push('-v', volume);
      });
    }

    // Add user
    if (options?.user) {
      args.push('-u', options.user);
    }

    // Add image and command
    args.push(imageName);
    args.push(...command);

    return this.runDockerCommand(args);
  }

  /**
   * Check if a Docker image exists locally
   */
  static async imageExists(imageName: string): Promise<boolean> {
    const result = await this.runDockerCommand(['images', '-q', imageName]);
    return result.success && result.stdout.length > 0;
  }

  /**
   * Remove a Docker image
   */
  static async removeImage(imageName: string): Promise<DockerCommandResult> {
    return this.runDockerCommand(['rmi', '-f', imageName]);
  }

  /**
   * Get Docker version information
   */
  static async getDockerInfo(): Promise<{
    version?: string;
    apiVersion?: string;
    platform?: string;
  }> {
    const result = await this.runDockerCommand(['version', '--format', 'json']);
    
    if (result.success) {
      try {
        const info = JSON.parse(result.stdout);
        return {
          version: info.Client?.Version,
          apiVersion: info.Client?.ApiVersion,
          platform: info.Client?.Platform?.Name,
        };
      } catch {
        // Fallback to parsing non-JSON output
        const versionResult = await this.runDockerCommand(['--version']);
        const match = versionResult.stdout.match(/Docker version ([0-9.]+)/);
        return {
          version: match ? match[1] : undefined,
        };
      }
    }

    return {};
  }

  /**
   * Parse Dockerfile to extract base image and other metadata
   */
  static async parseDockerfile(dockerfilePath: string): Promise<{
    baseImage?: string;
    exposedPorts?: number[];
    workdir?: string;
    user?: string;
  }> {
    try {
      const content = await fs.readFile(dockerfilePath, 'utf-8');
      const lines = content.split('\n');
      
      const result: {
        baseImage?: string;
        exposedPorts?: number[];
        workdir?: string;
        user?: string;
      } = {
        exposedPorts: [],
      };

      for (const line of lines) {
        const trimmed = line.trim();
        
        // Parse FROM directive
        if (trimmed.startsWith('FROM ')) {
          result.baseImage = trimmed.substring(5).trim();
        }
        
        // Parse EXPOSE directive
        if (trimmed.startsWith('EXPOSE ')) {
          const ports = trimmed.substring(7).trim().split(/\s+/);
          ports.forEach(port => {
            const portNum = parseInt(port);
            if (!isNaN(portNum)) {
              result.exposedPorts!.push(portNum);
            }
          });
        }
        
        // Parse WORKDIR directive
        if (trimmed.startsWith('WORKDIR ')) {
          result.workdir = trimmed.substring(8).trim();
        }
        
        // Parse USER directive
        if (trimmed.startsWith('USER ')) {
          result.user = trimmed.substring(5).trim();
        }
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to parse Dockerfile: ${error}`);
    }
  }
}