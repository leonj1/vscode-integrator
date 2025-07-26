import { ValidationError, ValidationWarning, ValidationResult } from '../types/ValidationTypes';

export class ValidationUtils {
  /**
   * Create a success validation result
   */
  static createSuccessResult(message: string, metadata?: Record<string, any>): ValidationResult {
    return {
      success: true,
      message,
      timestamp: new Date(),
      metadata,
    };
  }

  /**
   * Create a failure validation result
   */
  static createFailureResult(
    message: string,
    errors: ValidationError[],
    warnings?: ValidationWarning[]
  ): ValidationResult {
    return {
      success: false,
      message,
      errors,
      warnings,
      timestamp: new Date(),
    };
  }

  /**
   * Create a validation error
   */
  static createError(
    code: string,
    message: string,
    severity: 'error' | 'critical' = 'error',
    context?: {
      file?: string;
      line?: number;
      column?: number;
      [key: string]: any;
    }
  ): ValidationError {
    return {
      code,
      message,
      severity,
      file: context?.file,
      line: context?.line,
      column: context?.column,
      context: context ? { ...context } : undefined,
    };
  }

  /**
   * Create a validation warning
   */
  static createWarning(
    code: string,
    message: string,
    suggestion?: string,
    context?: {
      file?: string;
      line?: number;
      column?: number;
    }
  ): ValidationWarning {
    return {
      code,
      message,
      suggestion,
      file: context?.file,
      line: context?.line,
      column: context?.column,
    };
  }

  /**
   * Validate JSON schema
   */
  static validateJsonStructure(data: any, requiredFields: string[]): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const field of requiredFields) {
      if (!this.hasNestedProperty(data, field)) {
        errors.push(
          this.createError(
            'MISSING_FIELD',
            `Required field '${field}' is missing`,
            'error'
          )
        );
      }
    }

    return errors;
  }

  /**
   * Check if an object has a nested property
   */
  static hasNestedProperty(obj: any, path: string): boolean {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined || !(part in current)) {
        return false;
      }
      current = current[part];
    }

    return true;
  }

  /**
   * Validate file extension
   */
  static validateFileExtension(
    filePath: string,
    allowedExtensions: string[]
  ): ValidationError | null {
    const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      return this.createError(
        'INVALID_FILE_TYPE',
        `File type '${ext}' is not allowed. Expected one of: ${allowedExtensions.join(', ')}`,
        'error',
        { file: filePath }
      );
    }

    return null;
  }

  /**
   * Validate port number
   */
  static validatePort(port: number): ValidationError | null {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return this.createError(
        'INVALID_PORT',
        `Invalid port number: ${port}. Port must be between 1 and 65535`,
        'error'
      );
    }

    if (port < 1024) {
      return this.createError(
        'PRIVILEGED_PORT',
        `Port ${port} requires elevated privileges (ports below 1024)`,
        'error'
      );
    }

    return null;
  }

  /**
   * Validate environment variable name
   */
  static validateEnvVarName(name: string): ValidationError | null {
    const validPattern = /^[A-Z_][A-Z0-9_]*$/;
    
    if (!validPattern.test(name)) {
      return this.createError(
        'INVALID_ENV_VAR_NAME',
        `Invalid environment variable name: '${name}'. Must start with a letter or underscore and contain only uppercase letters, numbers, and underscores`,
        'error'
      );
    }

    return null;
  }

  /**
   * Merge multiple validation results
   */
  static mergeResults(results: ValidationResult[]): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];
    let success = true;
    const messages: string[] = [];

    for (const result of results) {
      if (!result.success) {
        success = false;
      }
      
      messages.push(result.message);
      
      if (result.errors) {
        allErrors.push(...result.errors);
      }
      
      if (result.warnings) {
        allWarnings.push(...result.warnings);
      }
    }

    return {
      success,
      message: messages.join('; '),
      errors: allErrors.length > 0 ? allErrors : undefined,
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
      timestamp: new Date(),
    };
  }

  /**
   * Format validation result as a readable string
   */
  static formatResult(result: ValidationResult, verbose: boolean = true): string {
    const lines: string[] = [];
    
    lines.push(`${result.success ? '✅' : '❌'} ${result.message}`);
    
    if (verbose) {
      if (result.errors && result.errors.length > 0) {
        lines.push('\nErrors:');
        result.errors.forEach((error, index) => {
          lines.push(`  ${index + 1}. [${error.code}] ${error.message}`);
          if (error.file) {
            lines.push(`     File: ${error.file}${error.line ? `:${error.line}` : ''}`);
          }
        });
      }
      
      if (result.warnings && result.warnings.length > 0) {
        lines.push('\nWarnings:');
        result.warnings.forEach((warning, index) => {
          lines.push(`  ${index + 1}. [${warning.code}] ${warning.message}`);
          if (warning.suggestion) {
            lines.push(`     Suggestion: ${warning.suggestion}`);
          }
        });
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Calculate validation summary statistics
   */
  static calculateSummary(results: ValidationResult[]): {
    total: number;
    passed: number;
    failed: number;
    errorCount: number;
    warningCount: number;
  } {
    let errorCount = 0;
    let warningCount = 0;
    let passed = 0;
    let failed = 0;

    for (const result of results) {
      if (result.success) {
        passed++;
      } else {
        failed++;
      }
      
      errorCount += result.errors?.length || 0;
      warningCount += result.warnings?.length || 0;
    }

    return {
      total: results.length,
      passed,
      failed,
      errorCount,
      warningCount,
    };
  }
}