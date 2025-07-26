export interface TaskConfiguration {
  version: string;
  tasks: Array<{
    label: string;
    type: string;
    command?: string;
    script?: string;
    args?: string[];
    group?: {
      kind: string;
      isDefault?: boolean;
    };
    problemMatcher?: string | string[];
    [key: string]: any;
  }>;
}

export interface TaskGeneratorOptions {
  projectType: 'node' | 'python' | 'go' | 'java' | 'rust';
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'poetry' | 'maven' | 'gradle' | 'cargo';
  customTasks?: any[];
}

export class TasksConfigGenerator {
  private projectType: string;
  private packageManager: string;

  constructor(options: TaskGeneratorOptions) {
    this.projectType = options.projectType;
    this.packageManager = options.packageManager || this.detectPackageManager(options.projectType);
  }

  private detectPackageManager(projectType: string): string {
    const defaults: Record<string, string> = {
      node: 'npm',
      python: 'pip',
      go: 'go',
      java: 'maven',
      rust: 'cargo'
    };
    return defaults[projectType] || 'npm';
  }

  generate(): TaskConfiguration {
    const tasks = this.getTasksForType();
    
    return {
      version: '2.0.0',
      tasks
    };
  }

  private getTasksForType(): any[] {
    switch (this.projectType) {
      case 'node':
        return this.getNodeTasks();
      case 'python':
        return this.getPythonTasks();
      case 'go':
        return this.getGoTasks();
      case 'java':
        return this.getJavaTasks();
      case 'rust':
        return this.getRustTasks();
      default:
        return [];
    }
  }

  private getNodeTasks() {
    const isNpm = this.packageManager === 'npm';
    const runner = this.packageManager;
    
    return [
      {
        label: 'install',
        type: 'shell',
        command: runner,
        args: ['install'],
        group: 'none',
        problemMatcher: [],
        presentation: {
          reveal: 'always',
          panel: 'new'
        }
      },
      {
        label: 'build',
        type: isNpm ? 'npm' : 'shell',
        script: isNpm ? 'build' : undefined,
        command: isNpm ? undefined : runner,
        args: isNpm ? [] : ['run', 'build'],
        group: {
          kind: 'build',
          isDefault: true
        },
        problemMatcher: ['$tsc'],
        detail: 'Build the project'
      },
      {
        label: 'test',
        type: isNpm ? 'npm' : 'shell',
        script: isNpm ? 'test' : undefined,
        command: isNpm ? undefined : runner,
        args: isNpm ? [] : ['run', 'test'],
        group: {
          kind: 'test',
          isDefault: true
        },
        problemMatcher: ['$tsc-watch'],
        isBackground: true,
        detail: 'Run tests'
      },
      {
        label: 'lint',
        type: isNpm ? 'npm' : 'shell',
        script: isNpm ? 'lint' : undefined,
        command: isNpm ? undefined : runner,
        args: isNpm ? [] : ['run', 'lint'],
        problemMatcher: ['$eslint-stylish'],
        detail: 'Lint the code'
      },
      {
        label: 'dev',
        type: isNpm ? 'npm' : 'shell',
        script: isNpm ? 'dev' : undefined,
        command: isNpm ? undefined : runner,
        args: isNpm ? [] : ['run', 'dev'],
        isBackground: true,
        problemMatcher: {
          owner: 'typescript',
          pattern: '$tsc',
          background: {
            activeOnStart: true,
            beginsPattern: {
              regexp: '(.*?)'
            },
            endsPattern: {
              regexp: 'Compiled|Failed'
            }
          }
        },
        detail: 'Start development server'
      }
    ];
  }

  private getPythonTasks() {
    const isPip = this.packageManager === 'pip';
    const runner = this.packageManager;
    
    return [
      {
        label: 'install dependencies',
        type: 'shell',
        command: isPip ? 'pip' : runner,
        args: isPip ? ['install', '-r', 'requirements.txt'] : ['install'],
        group: 'none',
        problemMatcher: [],
        detail: 'Install project dependencies'
      },
      {
        label: 'run',
        type: 'shell',
        command: '${command:python.interpreterPath}',
        args: ['${file}'],
        group: {
          kind: 'build',
          isDefault: true
        },
        problemMatcher: '$python',
        detail: 'Run current Python file'
      },
      {
        label: 'test',
        type: 'shell',
        command: '${command:python.interpreterPath}',
        args: ['-m', 'pytest', '-v'],
        group: {
          kind: 'test',
          isDefault: true
        },
        problemMatcher: '$python',
        detail: 'Run pytest tests'
      },
      {
        label: 'lint',
        type: 'shell',
        command: '${command:python.interpreterPath}',
        args: ['-m', 'pylint', '**/*.py'],
        problemMatcher: {
          owner: 'python',
          fileLocation: ['relative', '${workspaceFolder}'],
          pattern: {
            regexp: '^(.+):(\\d+):(\\d+): ([A-Z]\\d+): (.+)$',
            file: 1,
            line: 2,
            column: 3,
            code: 4,
            message: 5
          }
        },
        detail: 'Run pylint'
      },
      {
        label: 'format',
        type: 'shell',
        command: '${command:python.interpreterPath}',
        args: ['-m', 'black', '.'],
        problemMatcher: [],
        detail: 'Format code with Black'
      },
      {
        label: 'type check',
        type: 'shell',
        command: '${command:python.interpreterPath}',
        args: ['-m', 'mypy', '.'],
        problemMatcher: '$mypy',
        detail: 'Run mypy type checker'
      }
    ];
  }

  private getGoTasks() {
    return [
      {
        label: 'build',
        type: 'shell',
        command: 'go',
        args: ['build', '-v', './...'],
        group: {
          kind: 'build',
          isDefault: true
        },
        problemMatcher: '$go',
        detail: 'Build Go project'
      },
      {
        label: 'test',
        type: 'shell',
        command: 'go',
        args: ['test', '-v', './...'],
        group: {
          kind: 'test',
          isDefault: true
        },
        problemMatcher: '$go',
        detail: 'Run Go tests'
      },
      {
        label: 'run',
        type: 'shell',
        command: 'go',
        args: ['run', '${file}'],
        problemMatcher: '$go',
        detail: 'Run current Go file'
      },
      {
        label: 'fmt',
        type: 'shell',
        command: 'go',
        args: ['fmt', './...'],
        problemMatcher: [],
        detail: 'Format Go code'
      },
      {
        label: 'vet',
        type: 'shell',
        command: 'go',
        args: ['vet', './...'],
        problemMatcher: '$go',
        detail: 'Run go vet'
      },
      {
        label: 'mod tidy',
        type: 'shell',
        command: 'go',
        args: ['mod', 'tidy'],
        problemMatcher: [],
        detail: 'Tidy go.mod'
      },
      {
        label: 'test coverage',
        type: 'shell',
        command: 'go',
        args: ['test', '-coverprofile=coverage.out', './...'],
        group: 'test',
        problemMatcher: '$go',
        detail: 'Run tests with coverage'
      }
    ];
  }

  private getJavaTasks() {
    const isMaven = this.packageManager === 'maven';
    
    if (isMaven) {
      return [
        {
          label: 'compile',
          type: 'shell',
          command: 'mvn',
          args: ['compile'],
          group: {
            kind: 'build',
            isDefault: true
          },
          problemMatcher: '$javac',
          detail: 'Compile Java project'
        },
        {
          label: 'test',
          type: 'shell',
          command: 'mvn',
          args: ['test'],
          group: {
            kind: 'test',
            isDefault: true
          },
          problemMatcher: '$javac',
          detail: 'Run tests'
        },
        {
          label: 'package',
          type: 'shell',
          command: 'mvn',
          args: ['package'],
          group: 'build',
          problemMatcher: '$javac',
          detail: 'Package the application'
        },
        {
          label: 'clean',
          type: 'shell',
          command: 'mvn',
          args: ['clean'],
          problemMatcher: [],
          detail: 'Clean build artifacts'
        },
        {
          label: 'verify',
          type: 'shell',
          command: 'mvn',
          args: ['verify'],
          problemMatcher: '$javac',
          detail: 'Run verification checks'
        }
      ];
    } else {
      // Gradle tasks
      return [
        {
          label: 'build',
          type: 'shell',
          command: './gradlew',
          windows: {
            command: '.\\gradlew.bat'
          },
          args: ['build'],
          group: {
            kind: 'build',
            isDefault: true
          },
          problemMatcher: '$gradle',
          detail: 'Build with Gradle'
        },
        {
          label: 'test',
          type: 'shell',
          command: './gradlew',
          windows: {
            command: '.\\gradlew.bat'
          },
          args: ['test'],
          group: {
            kind: 'test',
            isDefault: true
          },
          problemMatcher: '$gradle',
          detail: 'Run tests'
        },
        {
          label: 'clean',
          type: 'shell',
          command: './gradlew',
          windows: {
            command: '.\\gradlew.bat'
          },
          args: ['clean'],
          problemMatcher: [],
          detail: 'Clean build artifacts'
        },
        {
          label: 'run',
          type: 'shell',
          command: './gradlew',
          windows: {
            command: '.\\gradlew.bat'
          },
          args: ['run'],
          problemMatcher: '$gradle',
          detail: 'Run the application'
        }
      ];
    }
  }

  private getRustTasks() {
    return [
      {
        label: 'build',
        type: 'cargo',
        command: 'build',
        problemMatcher: ['$rustc'],
        group: {
          kind: 'build',
          isDefault: true
        },
        detail: 'cargo build'
      },
      {
        label: 'build release',
        type: 'cargo',
        command: 'build',
        args: ['--release'],
        problemMatcher: ['$rustc'],
        group: 'build',
        detail: 'cargo build --release'
      },
      {
        label: 'test',
        type: 'cargo',
        command: 'test',
        problemMatcher: ['$rustc'],
        group: {
          kind: 'test',
          isDefault: true
        },
        detail: 'cargo test'
      },
      {
        label: 'run',
        type: 'cargo',
        command: 'run',
        problemMatcher: ['$rustc'],
        detail: 'cargo run'
      },
      {
        label: 'check',
        type: 'cargo',
        command: 'check',
        problemMatcher: ['$rustc'],
        detail: 'cargo check'
      },
      {
        label: 'clippy',
        type: 'cargo',
        command: 'clippy',
        args: ['--', '-D', 'warnings'],
        problemMatcher: ['$rustc'],
        detail: 'Run clippy linter'
      },
      {
        label: 'fmt',
        type: 'shell',
        command: 'cargo',
        args: ['fmt'],
        problemMatcher: [],
        detail: 'Format code with rustfmt'
      },
      {
        label: 'clean',
        type: 'cargo',
        command: 'clean',
        problemMatcher: [],
        detail: 'cargo clean'
      },
      {
        label: 'doc',
        type: 'cargo',
        command: 'doc',
        args: ['--open'],
        problemMatcher: [],
        detail: 'Generate and open documentation'
      }
    ];
  }

  toJSON(): string {
    return JSON.stringify(this.generate(), null, 2);
  }
}