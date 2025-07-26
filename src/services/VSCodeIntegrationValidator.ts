import * as path from 'path';
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  VSCodeLaunchConfig,
  VSCodeTaskConfig,
  VSCodeSettings,
  LaunchConfiguration,
  TaskConfiguration,
  ValidationReport,
} from '../types/ValidationTypes';
import { FileUtils } from '../utils/FileUtils';
import { ValidationUtils } from '../utils/ValidationUtils';

export class VSCodeIntegrationValidator {
  private projectPath: string;
  private vscodePath: string;

  constructor(projectPath: string) {
    this.projectPath = path.resolve(projectPath);
    this.vscodePath = path.join(this.projectPath, '.vscode');
  }

  /**
   * Validate launch.json configuration
   */
  async validateLaunchConfig(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const launchConfigPath = path.join(this.vscodePath, 'launch.json');

    try {
      // Check if launch.json exists
      if (!await FileUtils.fileExists(launchConfigPath)) {
        warnings.push(
          ValidationUtils.createWarning(
            'LAUNCH_CONFIG_MISSING',
            'No launch.json found',
            'Create a launch.json file to enable debugging in VSCode',
            { file: launchConfigPath }
          )
        );
        return ValidationUtils.createSuccessResult(
          'Launch configuration not present (optional)',
          undefined
        );
      }

      // Read and parse launch.json
      const config = await FileUtils.readJsonFile<VSCodeLaunchConfig>(launchConfigPath);

      // Validate version
      if (!config.version) {
        errors.push(
          ValidationUtils.createError(
            'MISSING_VERSION',
            'launch.json must specify a version',
            'error',
            { file: launchConfigPath }
          )
        );
      } else if (config.version !== '0.2.0') {
        warnings.push(
          ValidationUtils.createWarning(
            'OUTDATED_VERSION',
            `launch.json version ${config.version} may be outdated`,
            'Use version "0.2.0" for the latest features',
            { file: launchConfigPath }
          )
        );
      }

      // Validate configurations
      if (!config.configurations || !Array.isArray(config.configurations)) {
        errors.push(
          ValidationUtils.createError(
            'MISSING_CONFIGURATIONS',
            'launch.json must contain a configurations array',
            'error',
            { file: launchConfigPath }
          )
        );
      } else {
        // Validate each configuration
        config.configurations.forEach((launchConfig, index) => {
          const configErrors = this.validateLaunchConfiguration(launchConfig, index);
          errors.push(...configErrors);
        });

        // Check for duplicate configuration names
        const names = config.configurations.map(c => c.name);
        const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
        if (duplicates.length > 0) {
          errors.push(
            ValidationUtils.createError(
              'DUPLICATE_CONFIG_NAMES',
              `Duplicate configuration names found: ${duplicates.join(', ')}`,
              'error',
              { file: launchConfigPath }
            )
          );
        }
      }

      if (errors.length > 0) {
        return ValidationUtils.createFailureResult(
          'Launch configuration has errors',
          errors,
          warnings
        );
      }

      return ValidationUtils.createSuccessResult(
        'Launch configuration is valid',
        {
          configurationsCount: config.configurations?.length || 0,
        }
      );
    } catch (error) {
      errors.push(
        ValidationUtils.createError(
          'LAUNCH_PARSE_ERROR',
          error instanceof Error ? error.message : 'Failed to parse launch.json',
          'critical',
          { file: launchConfigPath }
        )
      );
      return ValidationUtils.createFailureResult(
        'Failed to validate launch configuration',
        errors
      );
    }
  }

  /**
   * Validate individual launch configuration
   */
  private validateLaunchConfiguration(
    config: LaunchConfiguration,
    index: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required fields
    if (!config.type) {
      errors.push(
        ValidationUtils.createError(
          'MISSING_TYPE',
          `Configuration ${index + 1} must specify a type`,
          'error'
        )
      );
    }

    if (!config.request) {
      errors.push(
        ValidationUtils.createError(
          'MISSING_REQUEST',
          `Configuration ${index + 1} must specify a request (launch or attach)`,
          'error'
        )
      );
    } else if (!['launch', 'attach'].includes(config.request)) {
      errors.push(
        ValidationUtils.createError(
          'INVALID_REQUEST',
          `Configuration ${index + 1} has invalid request type: ${config.request}`,
          'error'
        )
      );
    }

    if (!config.name) {
      errors.push(
        ValidationUtils.createError(
          'MISSING_NAME',
          `Configuration ${index + 1} must have a name`,
          'error'
        )
      );
    }

    // Type-specific validation
    switch (config.type) {
      case 'node':
      case 'node2':
      case 'pwa-node':
        if (config.request === 'launch' && !config.program) {
          errors.push(
            ValidationUtils.createError(
              'MISSING_PROGRAM',
              `Node.js launch configuration "${config.name}" must specify a program`,
              'error'
            )
          );
        }
        break;

      case 'chrome':
      case 'pwa-chrome':
      case 'edge':
      case 'pwa-msedge':
        if (config.request === 'launch' && !config.url && !config.file) {
          errors.push(
            ValidationUtils.createError(
              'MISSING_URL_OR_FILE',
              `Browser launch configuration "${config.name}" must specify a URL or file`,
              'error'
            )
          );
        }
        break;

      case 'python':
        if (config.request === 'launch' && !config.program && !config.module) {
          errors.push(
            ValidationUtils.createError(
              'MISSING_PROGRAM_OR_MODULE',
              `Python launch configuration "${config.name}" must specify a program or module`,
              'error'
            )
          );
        }
        break;
    }

    // Validate environment variables
    if (config.env && typeof config.env === 'object') {
      Object.keys(config.env).forEach((key) => {
        const envError = ValidationUtils.validateEnvVarName(key);
        if (envError) {
          errors.push(envError);
        }
      });
    }

    // Validate preLaunchTask reference
    if (config.preLaunchTask) {
      // Note: We'll validate task existence in testIntegration
    }

    return errors;
  }

  /**
   * Validate tasks.json configuration
   */
  async validateTasks(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const tasksConfigPath = path.join(this.vscodePath, 'tasks.json');

    try {
      // Check if tasks.json exists
      if (!await FileUtils.fileExists(tasksConfigPath)) {
        warnings.push(
          ValidationUtils.createWarning(
            'TASKS_CONFIG_MISSING',
            'No tasks.json found',
            'Create a tasks.json file to define build and other tasks',
            { file: tasksConfigPath }
          )
        );
        return ValidationUtils.createSuccessResult(
          'Tasks configuration not present (optional)',
          undefined
        );
      }

      // Read and parse tasks.json
      const config = await FileUtils.readJsonFile<VSCodeTaskConfig>(tasksConfigPath);

      // Validate version
      if (!config.version) {
        errors.push(
          ValidationUtils.createError(
            'MISSING_VERSION',
            'tasks.json must specify a version',
            'error',
            { file: tasksConfigPath }
          )
        );
      } else if (config.version !== '2.0.0') {
        warnings.push(
          ValidationUtils.createWarning(
            'OUTDATED_VERSION',
            `tasks.json version ${config.version} may be outdated`,
            'Use version "2.0.0" for the latest features',
            { file: tasksConfigPath }
          )
        );
      }

      // Validate tasks
      if (!config.tasks || !Array.isArray(config.tasks)) {
        errors.push(
          ValidationUtils.createError(
            'MISSING_TASKS',
            'tasks.json must contain a tasks array',
            'error',
            { file: tasksConfigPath }
          )
        );
      } else {
        // Validate each task
        const taskLabels = new Set<string>();
        config.tasks.forEach((task, index) => {
          const taskErrors = this.validateTaskConfiguration(task, index);
          errors.push(...taskErrors);

          // Check for duplicate labels
          if (task.label) {
            if (taskLabels.has(task.label)) {
              errors.push(
                ValidationUtils.createError(
                  'DUPLICATE_TASK_LABEL',
                  `Duplicate task label: ${task.label}`,
                  'error',
                  { file: tasksConfigPath }
                )
              );
            }
            taskLabels.add(task.label);
          }
        });

        // Validate task dependencies
        config.tasks.forEach((task) => {
          if (task.dependsOn) {
            const deps = Array.isArray(task.dependsOn) ? task.dependsOn : [task.dependsOn];
            deps.forEach((dep) => {
              if (!taskLabels.has(dep)) {
                errors.push(
                  ValidationUtils.createError(
                    'INVALID_DEPENDENCY',
                    `Task "${task.label}" depends on non-existent task "${dep}"`,
                    'error',
                    { file: tasksConfigPath }
                  )
                );
              }
            });
          }
        });
      }

      if (errors.length > 0) {
        return ValidationUtils.createFailureResult(
          'Tasks configuration has errors',
          errors,
          warnings
        );
      }

      return ValidationUtils.createSuccessResult(
        'Tasks configuration is valid',
        {
          tasksCount: config.tasks?.length || 0,
        }
      );
    } catch (error) {
      errors.push(
        ValidationUtils.createError(
          'TASKS_PARSE_ERROR',
          error instanceof Error ? error.message : 'Failed to parse tasks.json',
          'critical',
          { file: tasksConfigPath }
        )
      );
      return ValidationUtils.createFailureResult(
        'Failed to validate tasks configuration',
        errors
      );
    }
  }

  /**
   * Validate individual task configuration
   */
  private validateTaskConfiguration(task: TaskConfiguration, index: number): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required fields
    if (!task.label) {
      errors.push(
        ValidationUtils.createError(
          'MISSING_LABEL',
          `Task ${index + 1} must have a label`,
          'error'
        )
      );
    }

    if (!task.type) {
      errors.push(
        ValidationUtils.createError(
          'MISSING_TYPE',
          `Task "${task.label || index + 1}" must specify a type`,
          'error'
        )
      );
    }

    // Type-specific validation
    switch (task.type) {
      case 'shell':
      case 'process':
        if (!task.command) {
          errors.push(
            ValidationUtils.createError(
              'MISSING_COMMAND',
              `Task "${task.label || index + 1}" must specify a command`,
              'error'
            )
          );
        }
        break;

      case 'npm':
        if (!task.script && !task.path) {
          errors.push(
            ValidationUtils.createError(
              'MISSING_NPM_SCRIPT',
              `NPM task "${task.label || index + 1}" must specify a script`,
              'error'
            )
          );
        }
        break;
    }

    // Validate group
    if (task.group) {
      if (typeof task.group === 'string') {
        if (!['build', 'test', 'none'].includes(task.group)) {
          errors.push(
            ValidationUtils.createError(
              'INVALID_GROUP',
              `Task "${task.label || index + 1}" has invalid group: ${task.group}`,
              'error'
            )
          );
        }
      } else if (typeof task.group === 'object') {
        if (!task.group.kind || !['build', 'test', 'none'].includes(task.group.kind)) {
          errors.push(
            ValidationUtils.createError(
              'INVALID_GROUP_KIND',
              `Task "${task.label || index + 1}" has invalid group kind`,
              'error'
            )
          );
        }
      }
    }

    // Validate presentation
    if (task.presentation) {
      const validReveal = ['always', 'never', 'silent'];
      if (task.presentation.reveal && !validReveal.includes(task.presentation.reveal)) {
        errors.push(
          ValidationUtils.createError(
            'INVALID_PRESENTATION_REVEAL',
            `Task "${task.label || index + 1}" has invalid presentation.reveal value`,
            'error'
          )
        );
      }

      const validPanel = ['shared', 'dedicated', 'new'];
      if (task.presentation.panel && !validPanel.includes(task.presentation.panel)) {
        errors.push(
          ValidationUtils.createError(
            'INVALID_PRESENTATION_PANEL',
            `Task "${task.label || index + 1}" has invalid presentation.panel value`,
            'error'
          )
        );
      }
    }

    return errors;
  }

  /**
   * Validate settings.json configuration
   */
  async validateSettings(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const settingsPath = path.join(this.vscodePath, 'settings.json');

    try {
      // Check if settings.json exists
      if (!await FileUtils.fileExists(settingsPath)) {
        return ValidationUtils.createSuccessResult(
          'Settings configuration not present (optional)'
        );
      }

      // Read and parse settings.json
      const settings = await FileUtils.readJsonFile<VSCodeSettings>(settingsPath);

      // Validate it's a valid JSON object
      if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) {
        errors.push(
          ValidationUtils.createError(
            'INVALID_SETTINGS_FORMAT',
            'settings.json must be a JSON object',
            'critical',
            { file: settingsPath }
          )
        );
        return ValidationUtils.createFailureResult('Invalid settings format', errors);
      }

      // Check for common issues
      const settingsStr = JSON.stringify(settings);
      
      // Check for comments (which are not valid JSON)
      if (settingsStr.includes('//')) {
        warnings.push(
          ValidationUtils.createWarning(
            'POSSIBLE_COMMENTS',
            'settings.json may contain comments which are not valid JSON',
            'Use /* */ for comments or remove them',
            { file: settingsPath }
          )
        );
      }

      // Validate common settings patterns
      this.validateCommonSettings(settings, errors, warnings);

      if (errors.length > 0) {
        return ValidationUtils.createFailureResult(
          'Settings configuration has errors',
          errors,
          warnings
        );
      }

      return ValidationUtils.createSuccessResult(
        'Settings configuration is valid',
        {
          settingsCount: Object.keys(settings).length,
        }
      );
    } catch (error) {
      // Special handling for JSON parse errors
      if (error instanceof SyntaxError) {
        errors.push(
          ValidationUtils.createError(
            'SETTINGS_PARSE_ERROR',
            `Invalid JSON in settings.json: ${error.message}`,
            'critical',
            { file: settingsPath }
          )
        );
      } else {
        errors.push(
          ValidationUtils.createError(
            'SETTINGS_READ_ERROR',
            error instanceof Error ? error.message : 'Failed to read settings.json',
            'critical',
            { file: settingsPath }
          )
        );
      }
      return ValidationUtils.createFailureResult(
        'Failed to validate settings configuration',
        errors
      );
    }
  }

  /**
   * Validate common VSCode settings
   */
  private validateCommonSettings(
    settings: VSCodeSettings,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Check for deprecated settings
    const deprecatedSettings = [
      'terminal.integrated.shell.windows',
      'terminal.integrated.shell.linux',
      'terminal.integrated.shell.osx',
    ];

    Object.keys(settings).forEach((key) => {
      if (deprecatedSettings.includes(key)) {
        warnings.push(
          ValidationUtils.createWarning(
            'DEPRECATED_SETTING',
            `Setting "${key}" is deprecated`,
            'Use "terminal.integrated.defaultProfile.*" instead'
          )
        );
      }

      // Validate file associations
      if (key === 'files.associations' && typeof settings[key] === 'object') {
        Object.entries(settings[key] as Record<string, string>).forEach(([pattern, language]) => {
          if (typeof language !== 'string') {
            errors.push(
              ValidationUtils.createError(
                'INVALID_FILE_ASSOCIATION',
                `File association for "${pattern}" must be a string`,
                'error'
              )
            );
          }
        });
      }

      // Validate exclusion patterns
      if ((key === 'files.exclude' || key === 'search.exclude') && typeof settings[key] === 'object') {
        Object.entries(settings[key] as Record<string, boolean>).forEach(([pattern, value]) => {
          if (typeof value !== 'boolean') {
            errors.push(
              ValidationUtils.createError(
                'INVALID_EXCLUDE_PATTERN',
                `Exclude pattern "${pattern}" must have a boolean value`,
                'error'
              )
            );
          }
        });
      }

      // Validate editor settings
      if (key.startsWith('editor.')) {
        this.validateEditorSettings(key, settings[key], errors, warnings);
      }
    });
  }

  /**
   * Validate editor-specific settings
   */
  private validateEditorSettings(
    key: string,
    value: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const numericSettings = [
      'editor.fontSize',
      'editor.tabSize',
      'editor.rulers',
      'editor.lineHeight',
    ];

    const booleanSettings = [
      'editor.wordWrap',
      'editor.minimap.enabled',
      'editor.formatOnSave',
      'editor.formatOnPaste',
    ];

    if (numericSettings.some(s => key === s || key.startsWith(s + '.'))) {
      if (key === 'editor.rulers') {
        if (!Array.isArray(value)) {
          errors.push(
            ValidationUtils.createError(
              'INVALID_RULERS',
              'editor.rulers must be an array of numbers',
              'error'
            )
          );
        } else {
          value.forEach((ruler: any, index: number) => {
            if (typeof ruler !== 'number' || ruler <= 0) {
              errors.push(
                ValidationUtils.createError(
                  'INVALID_RULER_VALUE',
                  `editor.rulers[${index}] must be a positive number`,
                  'error'
                )
              );
            }
          });
        }
      } else if (typeof value !== 'number' || value <= 0) {
        errors.push(
          ValidationUtils.createError(
            'INVALID_NUMERIC_SETTING',
            `${key} must be a positive number`,
            'error'
          )
        );
      }
    }

    if (booleanSettings.includes(key) && typeof value !== 'boolean') {
      errors.push(
        ValidationUtils.createError(
          'INVALID_BOOLEAN_SETTING',
          `${key} must be a boolean`,
          'error'
        )
      );
    }
  }

  /**
   * Run full integration test
   */
  async testIntegration(): Promise<ValidationReport> {
    const startTime = Date.now();
    const results: ValidationResult[] = [];
    const recommendations: string[] = [];

    // Step 1: Check if .vscode directory exists
    const vscodeExists = await FileUtils.directoryExists(this.vscodePath);
    if (!vscodeExists) {
      results.push(
        ValidationUtils.createFailureResult(
          '.vscode directory not found',
          [
            ValidationUtils.createError(
              'VSCODE_DIR_MISSING',
              'No .vscode directory found in project',
              'critical',
              { file: this.vscodePath }
            ),
          ]
        )
      );
      recommendations.push('Create a .vscode directory to store VSCode configurations');
    } else {
      results.push(
        ValidationUtils.createSuccessResult('.vscode directory exists')
      );
    }

    // Step 2: Validate launch configuration
    const launchValidation = await this.validateLaunchConfig();
    results.push(launchValidation);

    // Step 3: Validate tasks configuration
    const tasksValidation = await this.validateTasks();
    results.push(tasksValidation);

    // Step 4: Validate settings
    const settingsValidation = await this.validateSettings();
    results.push(settingsValidation);

    // Step 5: Cross-validation checks
    if (vscodeExists) {
      const crossValidation = await this.performCrossValidation();
      results.push(crossValidation);
    }

    // Step 6: Check for recommended extensions
    const extensionsValidation = await this.validateExtensions();
    results.push(extensionsValidation);

    // Calculate summary
    const summary = ValidationUtils.calculateSummary(results);
    const duration = Date.now() - startTime;

    // Generate recommendations
    if (summary.errorCount > 0) {
      recommendations.push(`Fix ${summary.errorCount} errors before using VSCode integration`);
    }

    if (summary.warningCount > 0) {
      recommendations.push(`Review ${summary.warningCount} warnings to improve VSCode experience`);
    }

    const hasLaunch = results.find(r => r.message.includes('Launch configuration'))?.success;
    const hasTasks = results.find(r => r.message.includes('Tasks configuration'))?.success;

    if (!hasLaunch) {
      recommendations.push('Consider adding a launch.json for debugging support');
    }

    if (!hasTasks) {
      recommendations.push('Consider adding a tasks.json for build automation');
    }

    return {
      validator: 'VSCodeIntegrationValidator',
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
   * Perform cross-validation between configurations
   */
  private async performCrossValidation(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Check if launch.json references tasks
      const launchConfigPath = path.join(this.vscodePath, 'launch.json');
      const tasksConfigPath = path.join(this.vscodePath, 'tasks.json');

      if (await FileUtils.fileExists(launchConfigPath)) {
        const launchConfig = await FileUtils.readJsonFile<VSCodeLaunchConfig>(launchConfigPath);
        const taskLabels = new Set<string>();

        // Collect task labels if tasks.json exists
        if (await FileUtils.fileExists(tasksConfigPath)) {
          const tasksConfig = await FileUtils.readJsonFile<VSCodeTaskConfig>(tasksConfigPath);
          tasksConfig.tasks?.forEach(task => {
            if (task.label) {
              taskLabels.add(task.label);
            }
          });
        }

        // Check preLaunchTask references
        launchConfig.configurations?.forEach(config => {
          if (config.preLaunchTask && !taskLabels.has(config.preLaunchTask)) {
            errors.push(
              ValidationUtils.createError(
                'MISSING_PRELAUNCH_TASK',
                `Launch configuration "${config.name}" references non-existent task "${config.preLaunchTask}"`,
                'error'
              )
            );
          }
        });
      }

      // Check for conflicting settings
      const settingsPath = path.join(this.vscodePath, 'settings.json');
      if (await FileUtils.fileExists(settingsPath)) {
        const settings = await FileUtils.readJsonFile<VSCodeSettings>(settingsPath);
        
        // Check for conflicting formatter settings
        const formatters = ['editor.defaultFormatter', 'eslint.format.enable', 'prettier.enable'];
        const activeFormatters = formatters.filter(f => settings[f]);
        
        if (activeFormatters.length > 1) {
          warnings.push(
            ValidationUtils.createWarning(
              'MULTIPLE_FORMATTERS',
              'Multiple formatters may be configured',
              'Consider using only one formatter to avoid conflicts'
            )
          );
        }
      }

      if (errors.length > 0) {
        return ValidationUtils.createFailureResult(
          'Cross-validation found issues',
          errors,
          warnings
        );
      }

      return ValidationUtils.createSuccessResult(
        'Cross-validation passed',
        undefined
      );
    } catch (error) {
      return ValidationUtils.createFailureResult(
        'Cross-validation failed',
        [
          ValidationUtils.createError(
            'CROSS_VALIDATION_ERROR',
            error instanceof Error ? error.message : 'Unknown error',
            'error'
          ),
        ]
      );
    }
  }

  /**
   * Validate extensions recommendations
   */
  private async validateExtensions(): Promise<ValidationResult> {
    const warnings: ValidationWarning[] = [];
    const extensionsPath = path.join(this.vscodePath, 'extensions.json');

    try {
      // Check if extensions.json exists
      if (!await FileUtils.fileExists(extensionsPath)) {
        // Check if project might benefit from recommended extensions
        const projectFiles = await FileUtils.findFiles(
          this.projectPath,
          /\.(ts|tsx|js|jsx|py|go|java|rs)$/,
          { maxDepth: 3 }
        );

        if (projectFiles.length > 0) {
          warnings.push(
            ValidationUtils.createWarning(
              'NO_EXTENSIONS_RECOMMENDATIONS',
              'No extensions.json found',
              'Consider adding recommended extensions for your project type',
              { file: extensionsPath }
            )
          );
        }

        return ValidationUtils.createSuccessResult(
          'Extensions recommendations not present (optional)',
          undefined
        );
      }

      // Read and validate extensions.json
      const extensions = await FileUtils.readJsonFile<{
        recommendations?: string[];
        unwantedRecommendations?: string[];
      }>(extensionsPath);

      if (!extensions.recommendations || !Array.isArray(extensions.recommendations)) {
        warnings.push(
          ValidationUtils.createWarning(
            'NO_RECOMMENDATIONS',
            'extensions.json should contain a recommendations array',
            'Add recommended extensions for your project'
          )
        );
      }

      return ValidationUtils.createSuccessResult(
        'Extensions configuration is valid',
        {
          recommendedCount: extensions.recommendations?.length || 0,
          unwantedCount: extensions.unwantedRecommendations?.length || 0,
        }
      );
    } catch (error) {
      return ValidationUtils.createFailureResult(
        'Failed to validate extensions configuration',
        [
          ValidationUtils.createError(
            'EXTENSIONS_PARSE_ERROR',
            error instanceof Error ? error.message : 'Failed to parse extensions.json',
            'error',
            { file: extensionsPath }
          ),
        ]
      );
    }
  }

  /**
   * Get all task labels from tasks.json
   */
  async getTaskLabels(): Promise<string[]> {
    const tasksConfigPath = path.join(this.vscodePath, 'tasks.json');
    
    try {
      if (!await FileUtils.fileExists(tasksConfigPath)) {
        return [];
      }

      const config = await FileUtils.readJsonFile<VSCodeTaskConfig>(tasksConfigPath);
      return config.tasks?.map(task => task.label).filter(Boolean) || [];
    } catch {
      return [];
    }
  }

  /**
   * Get all launch configuration names
   */
  async getLaunchConfigurationNames(): Promise<string[]> {
    const launchConfigPath = path.join(this.vscodePath, 'launch.json');
    
    try {
      if (!await FileUtils.fileExists(launchConfigPath)) {
        return [];
      }

      const config = await FileUtils.readJsonFile<VSCodeLaunchConfig>(launchConfigPath);
      return config.configurations?.map(config => config.name).filter(Boolean) || [];
    } catch {
      return [];
    }
  }
}