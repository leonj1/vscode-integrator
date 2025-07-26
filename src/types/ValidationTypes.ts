/**
 * Common types and interfaces for validation operations
 */

export interface ValidationResult {
  success: boolean;
  message: string;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface ValidationError {
  code: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  severity: 'error' | 'critical';
  context?: Record<string, any>;
}

export interface ValidationWarning {
  code: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface DevContainerConfig {
  name?: string;
  image?: string;
  dockerFile?: string;
  context?: string;
  build?: {
    dockerfile?: string;
    context?: string;
    args?: Record<string, string>;
  };
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
}

export interface VSCodeLaunchConfig {
  version: string;
  configurations: LaunchConfiguration[];
}

export interface LaunchConfiguration {
  type: string;
  request: string;
  name: string;
  program?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  preLaunchTask?: string;
  [key: string]: any;
}

export interface VSCodeTaskConfig {
  version: string;
  tasks: TaskConfiguration[];
}

export interface TaskConfiguration {
  label: string;
  type: string;
  command?: string;
  args?: string[];
  group?: string | TaskGroup;
  presentation?: TaskPresentation;
  problemMatcher?: string | string[] | ProblemMatcher | ProblemMatcher[];
  dependsOn?: string | string[];
  [key: string]: any;
}

export interface TaskGroup {
  kind: string;
  isDefault?: boolean;
}

export interface TaskPresentation {
  reveal?: 'always' | 'never' | 'silent';
  echo?: boolean;
  focus?: boolean;
  panel?: 'shared' | 'dedicated' | 'new';
  showReuseMessage?: boolean;
  clear?: boolean;
}

export interface ProblemMatcher {
  owner: string;
  pattern: PatternMatcher | PatternMatcher[];
  fileLocation?: string | string[];
  severity?: string;
  applyTo?: string;
}

export interface PatternMatcher {
  regexp: string;
  file?: number;
  line?: number;
  column?: number;
  severity?: number;
  code?: number;
  message?: number;
}

export interface VSCodeSettings {
  [key: string]: any;
}

export interface DockerBuildResult {
  success: boolean;
  imageName?: string;
  imageId?: string;
  buildLog: string[];
  errors?: string[];
  duration: number;
}

export interface CompilationResult {
  success: boolean;
  output: string[];
  errors?: string[];
  warnings?: string[];
  duration: number;
}

export interface TestResult {
  success: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  testOutput: string[];
  errors?: string[];
  duration: number;
}

export interface ValidationReport {
  validator: string;
  timestamp: Date;
  duration: number;
  results: ValidationResult[];
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  recommendations?: string[];
}