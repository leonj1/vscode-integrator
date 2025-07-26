export interface LaunchConfiguration {
  version: string;
  configurations: Array<{
    type: string;
    request: string;
    name: string;
    [key: string]: any;
  }>;
}

export interface LaunchGeneratorOptions {
  projectType: 'node' | 'python' | 'go' | 'java' | 'rust';
  entryPoint?: string;
  workspaceFolder?: string;
  additionalConfigs?: any[];
}

export class LaunchConfigGenerator {
  private projectType: string;
  private entryPoint: string;
  private workspaceFolder: string;

  constructor(options: LaunchGeneratorOptions) {
    this.projectType = options.projectType;
    this.entryPoint = options.entryPoint || this.detectEntryPoint(options.projectType);
    this.workspaceFolder = options.workspaceFolder || '${workspaceFolder}';
  }

  private detectEntryPoint(projectType: string): string {
    const entryPoints: Record<string, string> = {
      node: 'index.js',
      python: 'main.py',
      go: 'main.go',
      java: 'src/main/java/Main.java',
      rust: 'src/main.rs'
    };
    return entryPoints[projectType] || 'main';
  }

  generate(): LaunchConfiguration {
    const configurations = this.getConfigurationsForType();
    
    return {
      version: '0.2.0',
      configurations
    };
  }

  private getConfigurationsForType(): any[] {
    switch (this.projectType) {
      case 'node':
        return this.getNodeConfigurations();
      case 'python':
        return this.getPythonConfigurations();
      case 'go':
        return this.getGoConfigurations();
      case 'java':
        return this.getJavaConfigurations();
      case 'rust':
        return this.getRustConfigurations();
      default:
        return [];
    }
  }

  private getNodeConfigurations() {
    return [
      {
        type: 'node',
        request: 'launch',
        name: 'Launch Program',
        skipFiles: ['<node_internals>/**'],
        program: '${workspaceFolder}/' + this.entryPoint,
        env: {
          NODE_ENV: 'development'
        }
      },
      {
        type: 'node',
        request: 'launch',
        name: 'Launch via NPM',
        runtimeExecutable: 'npm',
        runtimeArgs: ['run-script', 'start'],
        program: '${workspaceFolder}/package.json',
        skipFiles: ['<node_internals>/**'],
        cwd: '${workspaceFolder}'
      },
      {
        type: 'node',
        request: 'launch',
        name: 'Debug Tests',
        runtimeExecutable: 'npm',
        runtimeArgs: ['run-script', 'test'],
        program: '${workspaceFolder}/package.json',
        skipFiles: ['<node_internals>/**'],
        cwd: '${workspaceFolder}',
        env: {
          NODE_ENV: 'test'
        }
      },
      {
        type: 'node',
        request: 'attach',
        name: 'Attach to Process',
        port: 9229,
        skipFiles: ['<node_internals>/**']
      }
    ];
  }

  private getPythonConfigurations() {
    return [
      {
        name: 'Python: Current File',
        type: 'python',
        request: 'launch',
        program: '${file}',
        console: 'integratedTerminal',
        justMyCode: true
      },
      {
        name: 'Python: Module',
        type: 'python',
        request: 'launch',
        module: 'main',
        justMyCode: true,
        console: 'integratedTerminal'
      },
      {
        name: 'Python: Django',
        type: 'python',
        request: 'launch',
        program: '${workspaceFolder}/manage.py',
        args: ['runserver'],
        django: true,
        justMyCode: true,
        console: 'integratedTerminal'
      },
      {
        name: 'Python: Flask',
        type: 'python',
        request: 'launch',
        module: 'flask',
        env: {
          FLASK_APP: 'app.py',
          FLASK_DEBUG: '1'
        },
        args: ['run', '--no-debugger', '--no-reload'],
        jinja: true,
        justMyCode: true,
        console: 'integratedTerminal'
      },
      {
        name: 'Python: Pytest',
        type: 'python',
        request: 'launch',
        module: 'pytest',
        args: ['-v'],
        justMyCode: false,
        console: 'integratedTerminal'
      }
    ];
  }

  private getGoConfigurations() {
    return [
      {
        name: 'Launch Package',
        type: 'go',
        request: 'launch',
        mode: 'auto',
        program: '${workspaceFolder}',
        env: {},
        args: []
      },
      {
        name: 'Launch File',
        type: 'go',
        request: 'launch',
        mode: 'auto',
        program: '${file}',
        env: {},
        args: []
      },
      {
        name: 'Launch Test Function',
        type: 'go',
        request: 'launch',
        mode: 'test',
        program: '${workspaceFolder}',
        args: ['-test.run', 'MyTestFunction']
      },
      {
        name: 'Attach to Process',
        type: 'go',
        request: 'attach',
        mode: 'local',
        processId: '${command:pickProcess}'
      },
      {
        name: 'Connect to Server',
        type: 'go',
        request: 'attach',
        mode: 'remote',
        remotePath: '${workspaceFolder}',
        port: 2345,
        host: '127.0.0.1',
        showLog: true,
        trace: 'verbose'
      }
    ];
  }

  private getJavaConfigurations() {
    return [
      {
        type: 'java',
        name: 'Launch Current File',
        request: 'launch',
        mainClass: '${file}'
      },
      {
        type: 'java',
        name: 'Launch Main',
        request: 'launch',
        mainClass: 'Main',
        projectName: '${workspaceFolderBasename}'
      },
      {
        type: 'java',
        name: 'Launch with Arguments',
        request: 'launch',
        mainClass: 'Main',
        args: '${command:SpecifyProgramArgs}',
        projectName: '${workspaceFolderBasename}'
      },
      {
        type: 'java',
        name: 'Debug Tests',
        request: 'launch',
        mainClass: '',
        console: 'integratedTerminal',
        preLaunchTask: 'test'
      },
      {
        type: 'java',
        name: 'Attach to Remote',
        request: 'attach',
        hostName: 'localhost',
        port: 5005
      }
    ];
  }

  private getRustConfigurations() {
    return [
      {
        type: 'lldb',
        request: 'launch',
        name: 'Debug executable',
        cargo: {
          args: ['build', '--bin=${workspaceFolderBasename}', '--package=${workspaceFolderBasename}'],
          filter: {
            name: '${workspaceFolderBasename}',
            kind: 'bin'
          }
        },
        args: [],
        cwd: '${workspaceFolder}'
      },
      {
        type: 'lldb',
        request: 'launch',
        name: 'Debug unit tests',
        cargo: {
          args: ['test', '--no-run', '--bin=${workspaceFolderBasename}', '--package=${workspaceFolderBasename}'],
          filter: {
            name: '${workspaceFolderBasename}',
            kind: 'bin'
          }
        },
        args: [],
        cwd: '${workspaceFolder}'
      },
      {
        type: 'lldb',
        request: 'launch',
        name: 'Debug integration tests',
        cargo: {
          args: ['test', '--no-run', '--test=*'],
          filter: {
            kind: 'test'
          }
        },
        args: [],
        cwd: '${workspaceFolder}'
      },
      {
        type: 'lldb',
        request: 'launch',
        name: 'Debug with args',
        cargo: {
          args: ['build', '--bin=${workspaceFolderBasename}'],
          filter: {
            name: '${workspaceFolderBasename}',
            kind: 'bin'
          }
        },
        args: ['${input:args}'],
        cwd: '${workspaceFolder}'
      }
    ];
  }

  toJSON(): string {
    return JSON.stringify(this.generate(), null, 2);
  }
}