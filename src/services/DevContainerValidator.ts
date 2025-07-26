import * as path from 'path';
import { spawn } from 'child_process';
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  DevContainerConfig,
  DockerBuildResult,
  CompilationResult,
  TestResult,
  ValidationReport,
} from '../types/ValidationTypes';
import { DockerUtils } from '../utils/DockerUtils';
import { FileUtils } from '../utils/FileUtils';
import { ValidationUtils } from '../utils/ValidationUtils';

export class DevContainerValidator {
  private projectPath: string;
  private devContainerPath: string;
  private imageName: string;

  constructor(projectPath: string) {
    this.projectPath = path.resolve(projectPath);
    this.devContainerPath = path.join(this.projectPath, '.devcontainer');
    this.imageName = `devcontainer-${path.basename(this.projectPath)}-validation`;
  }

  /**
   * Build the devcontainer using Docker
   */
  async buildContainer(): Promise<DockerBuildResult> {
    const startTime = Date.now();
    const buildLog: string[] = [];
    const errors: string[] = [];

    try {
      // Check if Docker is available
      const dockerAvailable = await DockerUtils.isDockerAvailable();
      if (!dockerAvailable) {
        throw new Error('Docker is not installed or not running');
      }

      // Read devcontainer configuration
      const config = await this.readDevContainerConfig();
      
      // Determine Dockerfile path
      let dockerfilePath: string;
      let buildContext: string = this.projectPath;

      if (config.dockerFile) {
        dockerfilePath = path.join(this.devContainerPath, config.dockerFile);
      } else if (config.build?.dockerfile) {
        dockerfilePath = path.join(this.devContainerPath, config.build.dockerfile);
        if (config.build.context) {
          buildContext = path.join(this.projectPath, config.build.context);
        }
      } else if (config.image) {
        // If using a base image directly, create a temporary Dockerfile
        dockerfilePath = path.join(this.devContainerPath, 'Dockerfile.tmp');
        await FileUtils.writeJsonFile(dockerfilePath, `FROM ${config.image}`);
      } else {
        throw new Error('No Docker configuration found in devcontainer.json');
      }

      // Check if Dockerfile exists
      if (!await FileUtils.fileExists(dockerfilePath)) {
        throw new Error(`Dockerfile not found at ${dockerfilePath}`);
      }

      buildLog.push(`Building Docker image from ${dockerfilePath}`);
      buildLog.push(`Build context: ${buildContext}`);

      // Build the Docker image
      const buildArgs = config.build?.args || {};
      const result = await DockerUtils.buildImage(
        dockerfilePath,
        this.imageName,
        buildContext,
        buildArgs
      );

      buildLog.push(...result.stdout.split('\n').filter(line => line.trim()));
      
      if (!result.success) {
        errors.push(...result.stderr.split('\n').filter(line => line.trim()));
        throw new Error(`Docker build failed: ${result.stderr}`);
      }

      // Verify image was created
      const imageExists = await DockerUtils.imageExists(this.imageName);
      if (!imageExists) {
        throw new Error('Docker image was not created successfully');
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        imageName: this.imageName,
        buildLog,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        buildLog,
        errors: [...errors, error instanceof Error ? error.message : String(error)],
        duration,
      };
    }
  }

  /**
   * Run compilation inside the container
   */
  async runCompilation(): Promise<CompilationResult> {
    const startTime = Date.now();
    const output: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Ensure container image exists
      const imageExists = await DockerUtils.imageExists(this.imageName);
      if (!imageExists) {
        throw new Error('Container image not found. Please build the container first.');
      }

      // Determine compilation command based on project type
      const compilationCommand = await this.determineCompilationCommand();
      
      output.push(`Running compilation command: ${compilationCommand.join(' ')}`);

      // Run compilation in container
      const result = await DockerUtils.runInContainer(
        this.imageName,
        compilationCommand,
        {
          workdir: '/workspace',
          volumes: [`${this.projectPath}:/workspace`],
        }
      );

      output.push(...result.stdout.split('\n').filter(line => line.trim()));

      // Parse output for errors and warnings
      const outputLines = result.stdout.split('\n');
      for (const line of outputLines) {
        if (line.toLowerCase().includes('error:') || line.toLowerCase().includes('error ')) {
          errors.push(line);
        } else if (line.toLowerCase().includes('warning:') || line.toLowerCase().includes('warn:')) {
          warnings.push(line);
        }
      }

      if (!result.success) {
        errors.push(...result.stderr.split('\n').filter(line => line.trim()));
        throw new Error('Compilation failed');
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        output,
        warnings: warnings.length > 0 ? warnings : undefined,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        output,
        errors: [...errors, error instanceof Error ? error.message : String(error)],
        duration,
      };
    }
  }

  /**
   * Run tests inside the container
   */
  async runTests(): Promise<TestResult> {
    const startTime = Date.now();
    const testOutput: string[] = [];
    const errors: string[] = [];

    try {
      // Ensure container image exists
      const imageExists = await DockerUtils.imageExists(this.imageName);
      if (!imageExists) {
        throw new Error('Container image not found. Please build the container first.');
      }

      // Determine test command based on project type
      const testCommand = await this.determineTestCommand();
      
      testOutput.push(`Running test command: ${testCommand.join(' ')}`);

      // Run tests in container
      const result = await DockerUtils.runInContainer(
        this.imageName,
        testCommand,
        {
          workdir: '/workspace',
          volumes: [`${this.projectPath}:/workspace`],
          env: {
            CI: 'true',
            NODE_ENV: 'test',
          },
        }
      );

      testOutput.push(...result.stdout.split('\n').filter(line => line.trim()));

      // Parse test results
      const testResults = this.parseTestOutput(result.stdout);

      if (!result.success && testResults.failedTests === 0) {
        errors.push(...result.stderr.split('\n').filter(line => line.trim()));
        throw new Error('Test execution failed');
      }

      const duration = Date.now() - startTime;

      return {
        success: testResults.failedTests === 0,
        totalTests: testResults.totalTests,
        passedTests: testResults.passedTests,
        failedTests: testResults.failedTests,
        skippedTests: testResults.skippedTests,
        testOutput,
        errors: errors.length > 0 ? errors : undefined,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        testOutput,
        errors: [...errors, error instanceof Error ? error.message : String(error)],
        duration,
      };
    }
  }

  /**
   * Comprehensive validation of the devcontainer setup
   */
  async validateSetup(): Promise<ValidationReport> {
    const startTime = Date.now();
    const results: ValidationResult[] = [];
    const recommendations: string[] = [];

    // Step 1: Validate devcontainer.json exists and is valid
    const configValidation = await this.validateDevContainerConfig();
    results.push(configValidation);

    if (!configValidation.success) {
      recommendations.push('Fix devcontainer.json configuration before proceeding');
    }

    // Step 2: Validate Docker is available
    const dockerValidation = await this.validateDockerEnvironment();
    results.push(dockerValidation);

    if (!dockerValidation.success) {
      recommendations.push('Ensure Docker is installed and running');
    }

    // Step 3: Validate Dockerfile if present
    if (configValidation.success) {
      const dockerfileValidation = await this.validateDockerfile();
      results.push(dockerfileValidation);
    }

    // Step 4: Attempt to build the container
    if (dockerValidation.success && configValidation.success) {
      const buildResult = await this.buildContainer();
      results.push(
        buildResult.success
          ? ValidationUtils.createSuccessResult('Container built successfully', {
              imageName: buildResult.imageName,
              duration: buildResult.duration,
            })
          : ValidationUtils.createFailureResult(
              'Container build failed',
              buildResult.errors?.map((err) =>
                ValidationUtils.createError('BUILD_ERROR', err, 'error')
              ) || []
            )
      );

      // Step 5: If build successful, try compilation
      if (buildResult.success) {
        const compilationResult = await this.runCompilation();
        results.push(
          compilationResult.success
            ? ValidationUtils.createSuccessResult('Compilation successful', {
                duration: compilationResult.duration,
                warnings: compilationResult.warnings,
              })
            : ValidationUtils.createFailureResult(
                'Compilation failed',
                compilationResult.errors?.map((err) =>
                  ValidationUtils.createError('COMPILATION_ERROR', err, 'error')
                ) || []
              )
        );

        // Step 6: If compilation successful, try running tests
        if (compilationResult.success) {
          const testResult = await this.runTests();
          results.push(
            testResult.success
              ? ValidationUtils.createSuccessResult(
                  `All ${testResult.totalTests} tests passed`,
                  {
                    totalTests: testResult.totalTests,
                    duration: testResult.duration,
                  }
                )
              : ValidationUtils.createFailureResult(
                  `${testResult.failedTests} of ${testResult.totalTests} tests failed`,
                  testResult.errors?.map((err) =>
                    ValidationUtils.createError('TEST_FAILURE', err, 'error')
                  ) || []
                )
          );
        } else {
          recommendations.push('Fix compilation errors before running tests');
        }
      } else {
        recommendations.push('Fix container build issues before proceeding with compilation and tests');
      }
    }

    // Calculate summary
    const summary = ValidationUtils.calculateSummary(results);
    const duration = Date.now() - startTime;

    // Add general recommendations
    if (summary.warningCount > 0) {
      recommendations.push(`Address ${summary.warningCount} warnings to improve container setup`);
    }

    return {
      validator: 'DevContainerValidator',
      timestamp: new Date(),
      duration,
      results,
      summary: {
        totalChecks: summary.total,
        passed: summary.passed,
        failed: summary.failed,
        warnings: summary.warningCount,
      },
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    };
  }

  /**
   * Validate devcontainer.json configuration
   */
  private async validateDevContainerConfig(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const configPath = path.join(this.devContainerPath, 'devcontainer.json');

    try {
      // Check if devcontainer.json exists
      if (!await FileUtils.fileExists(configPath)) {
        errors.push(
          ValidationUtils.createError(
            'DEVCONTAINER_NOT_FOUND',
            'devcontainer.json file not found',
            'critical',
            { file: configPath }
          )
        );
        return ValidationUtils.createFailureResult('DevContainer configuration missing', errors);
      }

      // Read and parse the configuration
      const config = await this.readDevContainerConfig();

      // Validate required fields
      if (!config.image && !config.dockerFile && !config.build?.dockerfile) {
        errors.push(
          ValidationUtils.createError(
            'NO_DOCKER_CONFIG',
            'No Docker configuration found (image, dockerFile, or build.dockerfile required)',
            'critical'
          )
        );
      }

      // Validate extensions format
      if (config.customizations?.vscode?.extensions) {
        if (!Array.isArray(config.customizations.vscode.extensions)) {
          errors.push(
            ValidationUtils.createError(
              'INVALID_EXTENSIONS_FORMAT',
              'VSCode extensions must be an array',
              'error'
            )
          );
        }
      }

      // Validate forward ports
      if (config.forwardPorts) {
        if (!Array.isArray(config.forwardPorts)) {
          errors.push(
            ValidationUtils.createError(
              'INVALID_PORTS_FORMAT',
              'forwardPorts must be an array',
              'error'
            )
          );
        } else {
          config.forwardPorts.forEach((port) => {
            const portError = ValidationUtils.validatePort(port);
            if (portError) {
              errors.push(portError);
            }
          });
        }
      }

      if (errors.length > 0) {
        return ValidationUtils.createFailureResult('DevContainer configuration has errors', errors);
      }

      return ValidationUtils.createSuccessResult('DevContainer configuration is valid');
    } catch (error) {
      errors.push(
        ValidationUtils.createError(
          'CONFIG_PARSE_ERROR',
          error instanceof Error ? error.message : 'Failed to parse devcontainer.json',
          'critical',
          { file: configPath }
        )
      );
      return ValidationUtils.createFailureResult('Failed to validate DevContainer configuration', errors);
    }
  }

  /**
   * Validate Docker environment
   */
  private async validateDockerEnvironment(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    try {
      const dockerAvailable = await DockerUtils.isDockerAvailable();
      if (!dockerAvailable) {
        errors.push(
          ValidationUtils.createError(
            'DOCKER_NOT_AVAILABLE',
            'Docker is not installed or not running',
            'critical'
          )
        );
        return ValidationUtils.createFailureResult('Docker environment not available', errors);
      }

      const dockerInfo = await DockerUtils.getDockerInfo();
      return ValidationUtils.createSuccessResult('Docker environment is valid', {
        version: dockerInfo.version,
        platform: dockerInfo.platform,
      });
    } catch (error) {
      errors.push(
        ValidationUtils.createError(
          'DOCKER_CHECK_ERROR',
          error instanceof Error ? error.message : 'Failed to check Docker environment',
          'critical'
        )
      );
      return ValidationUtils.createFailureResult('Failed to validate Docker environment', errors);
    }
  }

  /**
   * Validate Dockerfile
   */
  private async validateDockerfile(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const config = await this.readDevContainerConfig();
      let dockerfilePath: string | null = null;

      if (config.dockerFile) {
        dockerfilePath = path.join(this.devContainerPath, config.dockerFile);
      } else if (config.build?.dockerfile) {
        dockerfilePath = path.join(this.devContainerPath, config.build.dockerfile);
      }

      if (!dockerfilePath) {
        return ValidationUtils.createSuccessResult('No Dockerfile to validate (using base image)');
      }

      if (!await FileUtils.fileExists(dockerfilePath)) {
        errors.push(
          ValidationUtils.createError(
            'DOCKERFILE_NOT_FOUND',
            `Dockerfile not found at ${dockerfilePath}`,
            'critical',
            { file: dockerfilePath }
          )
        );
        return ValidationUtils.createFailureResult('Dockerfile not found', errors);
      }

      // Parse Dockerfile
      const dockerfileInfo = await DockerUtils.parseDockerfile(dockerfilePath);

      // Check if base image is specified
      if (!dockerfileInfo.baseImage) {
        errors.push(
          ValidationUtils.createError(
            'NO_BASE_IMAGE',
            'Dockerfile must specify a FROM directive',
            'critical',
            { file: dockerfilePath }
          )
        );
      }

      // Warn about missing WORKDIR
      if (!dockerfileInfo.workdir) {
        warnings.push(
          ValidationUtils.createWarning(
            'NO_WORKDIR',
            'Consider setting WORKDIR in Dockerfile',
            'Add WORKDIR /workspace to set the working directory',
            { file: dockerfilePath }
          )
        );
      }

      if (errors.length > 0) {
        return ValidationUtils.createFailureResult('Dockerfile validation failed', errors, warnings);
      }

      return ValidationUtils.createSuccessResult('Dockerfile is valid', {
        baseImage: dockerfileInfo.baseImage,
        workdir: dockerfileInfo.workdir,
        user: dockerfileInfo.user,
      });
    } catch (error) {
      errors.push(
        ValidationUtils.createError(
          'DOCKERFILE_PARSE_ERROR',
          error instanceof Error ? error.message : 'Failed to parse Dockerfile',
          'error'
        )
      );
      return ValidationUtils.createFailureResult('Failed to validate Dockerfile', errors);
    }
  }

  /**
   * Read and parse devcontainer.json
   */
  private async readDevContainerConfig(): Promise<DevContainerConfig> {
    const configPath = path.join(this.devContainerPath, 'devcontainer.json');
    return FileUtils.readJsonFile<DevContainerConfig>(configPath);
  }

  /**
   * Determine compilation command based on project type
   */
  private async determineCompilationCommand(): Promise<string[]> {
    // Check for various project types and their build commands
    if (await FileUtils.fileExists(path.join(this.projectPath, 'package.json'))) {
      const packageJson = await FileUtils.readJsonFile(path.join(this.projectPath, 'package.json'));
      if (packageJson.scripts?.build) {
        return ['npm', 'run', 'build'];
      }
      if (packageJson.scripts?.compile) {
        return ['npm', 'run', 'compile'];
      }
      // TypeScript project
      if (packageJson.devDependencies?.typescript || packageJson.dependencies?.typescript) {
        return ['npx', 'tsc'];
      }
    }

    // Python project
    if (await FileUtils.fileExists(path.join(this.projectPath, 'setup.py'))) {
      return ['python', 'setup.py', 'build'];
    }

    // Go project
    if (await FileUtils.fileExists(path.join(this.projectPath, 'go.mod'))) {
      return ['go', 'build', './...'];
    }

    // Java project (Maven)
    if (await FileUtils.fileExists(path.join(this.projectPath, 'pom.xml'))) {
      return ['mvn', 'compile'];
    }

    // Java project (Gradle)
    if (await FileUtils.fileExists(path.join(this.projectPath, 'build.gradle'))) {
      return ['gradle', 'build'];
    }

    // Default: try make
    if (await FileUtils.fileExists(path.join(this.projectPath, 'Makefile'))) {
      return ['make'];
    }

    // Fallback to a simple echo
    return ['echo', 'No build command found'];
  }

  /**
   * Determine test command based on project type
   */
  private async determineTestCommand(): Promise<string[]> {
    // Check for various project types and their test commands
    if (await FileUtils.fileExists(path.join(this.projectPath, 'package.json'))) {
      const packageJson = await FileUtils.readJsonFile(path.join(this.projectPath, 'package.json'));
      if (packageJson.scripts?.test) {
        return ['npm', 'test'];
      }
    }

    // Python project
    if (await FileUtils.fileExists(path.join(this.projectPath, 'setup.py')) ||
        await FileUtils.fileExists(path.join(this.projectPath, 'pytest.ini'))) {
      return ['pytest'];
    }

    // Go project
    if (await FileUtils.fileExists(path.join(this.projectPath, 'go.mod'))) {
      return ['go', 'test', './...'];
    }

    // Java project (Maven)
    if (await FileUtils.fileExists(path.join(this.projectPath, 'pom.xml'))) {
      return ['mvn', 'test'];
    }

    // Java project (Gradle)
    if (await FileUtils.fileExists(path.join(this.projectPath, 'build.gradle'))) {
      return ['gradle', 'test'];
    }

    // Default: try make test
    if (await FileUtils.fileExists(path.join(this.projectPath, 'Makefile'))) {
      return ['make', 'test'];
    }

    // Fallback
    return ['echo', 'No test command found'];
  }

  /**
   * Parse test output to extract test results
   */
  private parseTestOutput(output: string): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
  } {
    // Try to parse common test output formats
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;

    // Jest format
    const jestMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (jestMatch) {
      failedTests = parseInt(jestMatch[1]);
      passedTests = parseInt(jestMatch[2]);
      totalTests = parseInt(jestMatch[3]);
    }

    // Mocha format
    const mochaMatch = output.match(/(\d+)\s+passing.*?(\d+)\s+failing/);
    if (mochaMatch) {
      passedTests = parseInt(mochaMatch[1]);
      failedTests = parseInt(mochaMatch[2]);
      totalTests = passedTests + failedTests;
    }

    // pytest format
    const pytestMatch = output.match(/(\d+)\s+passed.*?(\d+)\s+failed/);
    if (pytestMatch) {
      passedTests = parseInt(pytestMatch[1]);
      failedTests = parseInt(pytestMatch[2]);
      totalTests = passedTests + failedTests;
    }

    // Go test format
    const goTestMatch = output.match(/PASS|FAIL/g);
    if (goTestMatch) {
      goTestMatch.forEach((match) => {
        totalTests++;
        if (match === 'PASS') {
          passedTests++;
        } else {
          failedTests++;
        }
      });
    }

    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      // Remove the validation image if it exists
      if (await DockerUtils.imageExists(this.imageName)) {
        await DockerUtils.removeImage(this.imageName);
      }
    } catch (error) {
      console.error('Failed to cleanup resources:', error);
    }
  }
}