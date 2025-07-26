import { LaunchConfigGenerator, LaunchGeneratorOptions } from '../LaunchConfigGenerator';

describe('LaunchConfigGenerator', () => {
  describe('constructor', () => {
    it('should initialize with provided options', () => {
      const options: LaunchGeneratorOptions = {
        projectType: 'node',
        entryPoint: 'app.js',
        workspaceFolder: '/test/workspace'
      };
      const generator = new LaunchConfigGenerator(options);
      expect(generator).toBeInstanceOf(LaunchConfigGenerator);
    });

    it('should use default entry point if not provided', () => {
      const options: LaunchGeneratorOptions = { projectType: 'python' };
      const generator = new LaunchConfigGenerator(options);
      const config = generator.generate();
      
      // Python configs should reference main.py
      const moduleConfig = config.configurations.find(c => c.name === 'Python: Module');
      expect(moduleConfig?.module).toBe('main');
    });

    it('should use default workspace folder if not provided', () => {
      const options: LaunchGeneratorOptions = { projectType: 'node' };
      const generator = new LaunchConfigGenerator(options);
      const config = generator.generate();
      
      const launchConfig = config.configurations.find(c => c.name === 'Launch Program');
      expect(launchConfig?.program).toContain('${workspaceFolder}');
    });
  });

  describe('generate', () => {
    it('should generate correct version', () => {
      const generator = new LaunchConfigGenerator({ projectType: 'node' });
      const config = generator.generate();
      expect(config.version).toBe('0.2.0');
    });

    it('should return empty configurations for unknown project type', () => {
      const generator = new LaunchConfigGenerator({ projectType: 'unknown' as any });
      const config = generator.generate();
      expect(config.configurations).toEqual([]);
    });
  });

  describe('Node.js configurations', () => {
    let generator: LaunchConfigGenerator;
    let config: any;

    beforeEach(() => {
      generator = new LaunchConfigGenerator({ 
        projectType: 'node',
        entryPoint: 'server.js'
      });
      config = generator.generate();
    });

    it('should generate 4 Node.js configurations', () => {
      expect(config.configurations).toHaveLength(4);
    });

    it('should include Launch Program configuration', () => {
      const launchConfig = config.configurations.find((c: any) => c.name === 'Launch Program');
      expect(launchConfig).toBeDefined();
      expect(launchConfig.type).toBe('node');
      expect(launchConfig.request).toBe('launch');
      expect(launchConfig.program).toBe('${workspaceFolder}/server.js');
      expect(launchConfig.env.NODE_ENV).toBe('development');
      expect(launchConfig.skipFiles).toContain('<node_internals>/**');
    });

    it('should include Launch via NPM configuration', () => {
      const npmConfig = config.configurations.find((c: any) => c.name === 'Launch via NPM');
      expect(npmConfig).toBeDefined();
      expect(npmConfig.runtimeExecutable).toBe('npm');
      expect(npmConfig.runtimeArgs).toEqual(['run-script', 'start']);
      expect(npmConfig.cwd).toBe('${workspaceFolder}');
    });

    it('should include Debug Tests configuration', () => {
      const testConfig = config.configurations.find((c: any) => c.name === 'Debug Tests');
      expect(testConfig).toBeDefined();
      expect(testConfig.runtimeExecutable).toBe('npm');
      expect(testConfig.runtimeArgs).toEqual(['run-script', 'test']);
      expect(testConfig.env.NODE_ENV).toBe('test');
    });

    it('should include Attach to Process configuration', () => {
      const attachConfig = config.configurations.find((c: any) => c.name === 'Attach to Process');
      expect(attachConfig).toBeDefined();
      expect(attachConfig.request).toBe('attach');
      expect(attachConfig.port).toBe(9229);
    });
  });

  describe('Python configurations', () => {
    let generator: LaunchConfigGenerator;
    let config: any;

    beforeEach(() => {
      generator = new LaunchConfigGenerator({ projectType: 'python' });
      config = generator.generate();
    });

    it('should generate 5 Python configurations', () => {
      expect(config.configurations).toHaveLength(5);
    });

    it('should include Python: Current File configuration', () => {
      const currentFileConfig = config.configurations.find((c: any) => c.name === 'Python: Current File');
      expect(currentFileConfig).toBeDefined();
      expect(currentFileConfig.type).toBe('python');
      expect(currentFileConfig.request).toBe('launch');
      expect(currentFileConfig.program).toBe('${file}');
      expect(currentFileConfig.console).toBe('integratedTerminal');
      expect(currentFileConfig.justMyCode).toBe(true);
    });

    it('should include Python: Module configuration', () => {
      const moduleConfig = config.configurations.find((c: any) => c.name === 'Python: Module');
      expect(moduleConfig).toBeDefined();
      expect(moduleConfig.module).toBe('main');
    });

    it('should include Python: Django configuration', () => {
      const djangoConfig = config.configurations.find((c: any) => c.name === 'Python: Django');
      expect(djangoConfig).toBeDefined();
      expect(djangoConfig.program).toBe('${workspaceFolder}/manage.py');
      expect(djangoConfig.args).toEqual(['runserver']);
      expect(djangoConfig.django).toBe(true);
    });

    it('should include Python: Flask configuration', () => {
      const flaskConfig = config.configurations.find((c: any) => c.name === 'Python: Flask');
      expect(flaskConfig).toBeDefined();
      expect(flaskConfig.module).toBe('flask');
      expect(flaskConfig.env.FLASK_APP).toBe('app.py');
      expect(flaskConfig.env.FLASK_DEBUG).toBe('1');
      expect(flaskConfig.jinja).toBe(true);
    });

    it('should include Python: Pytest configuration', () => {
      const pytestConfig = config.configurations.find((c: any) => c.name === 'Python: Pytest');
      expect(pytestConfig).toBeDefined();
      expect(pytestConfig.module).toBe('pytest');
      expect(pytestConfig.args).toEqual(['-v']);
      expect(pytestConfig.justMyCode).toBe(false);
    });
  });

  describe('Go configurations', () => {
    let generator: LaunchConfigGenerator;
    let config: any;

    beforeEach(() => {
      generator = new LaunchConfigGenerator({ projectType: 'go' });
      config = generator.generate();
    });

    it('should generate 5 Go configurations', () => {
      expect(config.configurations).toHaveLength(5);
    });

    it('should include Launch Package configuration', () => {
      const packageConfig = config.configurations.find((c: any) => c.name === 'Launch Package');
      expect(packageConfig).toBeDefined();
      expect(packageConfig.type).toBe('go');
      expect(packageConfig.request).toBe('launch');
      expect(packageConfig.mode).toBe('auto');
      expect(packageConfig.program).toBe('${workspaceFolder}');
    });

    it('should include Launch File configuration', () => {
      const fileConfig = config.configurations.find((c: any) => c.name === 'Launch File');
      expect(fileConfig).toBeDefined();
      expect(fileConfig.program).toBe('${file}');
    });

    it('should include Launch Test Function configuration', () => {
      const testConfig = config.configurations.find((c: any) => c.name === 'Launch Test Function');
      expect(testConfig).toBeDefined();
      expect(testConfig.mode).toBe('test');
      expect(testConfig.args).toContain('-test.run');
    });

    it('should include Attach to Process configuration', () => {
      const attachConfig = config.configurations.find((c: any) => c.name === 'Attach to Process');
      expect(attachConfig).toBeDefined();
      expect(attachConfig.request).toBe('attach');
      expect(attachConfig.mode).toBe('local');
      expect(attachConfig.processId).toBe('${command:pickProcess}');
    });

    it('should include Connect to Server configuration', () => {
      const remoteConfig = config.configurations.find((c: any) => c.name === 'Connect to Server');
      expect(remoteConfig).toBeDefined();
      expect(remoteConfig.mode).toBe('remote');
      expect(remoteConfig.port).toBe(2345);
      expect(remoteConfig.host).toBe('127.0.0.1');
    });
  });

  describe('Java configurations', () => {
    let generator: LaunchConfigGenerator;
    let config: any;

    beforeEach(() => {
      generator = new LaunchConfigGenerator({ projectType: 'java' });
      config = generator.generate();
    });

    it('should generate 5 Java configurations', () => {
      expect(config.configurations).toHaveLength(5);
    });

    it('should include Launch Current File configuration', () => {
      const currentFileConfig = config.configurations.find((c: any) => c.name === 'Launch Current File');
      expect(currentFileConfig).toBeDefined();
      expect(currentFileConfig.type).toBe('java');
      expect(currentFileConfig.request).toBe('launch');
      expect(currentFileConfig.mainClass).toBe('${file}');
    });

    it('should include Launch Main configuration', () => {
      const mainConfig = config.configurations.find((c: any) => c.name === 'Launch Main');
      expect(mainConfig).toBeDefined();
      expect(mainConfig.mainClass).toBe('Main');
      expect(mainConfig.projectName).toBe('${workspaceFolderBasename}');
    });

    it('should include Launch with Arguments configuration', () => {
      const argsConfig = config.configurations.find((c: any) => c.name === 'Launch with Arguments');
      expect(argsConfig).toBeDefined();
      expect(argsConfig.args).toBe('${command:SpecifyProgramArgs}');
    });

    it('should include Debug Tests configuration', () => {
      const testConfig = config.configurations.find((c: any) => c.name === 'Debug Tests');
      expect(testConfig).toBeDefined();
      expect(testConfig.console).toBe('integratedTerminal');
      expect(testConfig.preLaunchTask).toBe('test');
    });

    it('should include Attach to Remote configuration', () => {
      const remoteConfig = config.configurations.find((c: any) => c.name === 'Attach to Remote');
      expect(remoteConfig).toBeDefined();
      expect(remoteConfig.request).toBe('attach');
      expect(remoteConfig.hostName).toBe('localhost');
      expect(remoteConfig.port).toBe(5005);
    });
  });

  describe('Rust configurations', () => {
    let generator: LaunchConfigGenerator;
    let config: any;

    beforeEach(() => {
      generator = new LaunchConfigGenerator({ projectType: 'rust' });
      config = generator.generate();
    });

    it('should generate 4 Rust configurations', () => {
      expect(config.configurations).toHaveLength(4);
    });

    it('should include Debug executable configuration', () => {
      const execConfig = config.configurations.find((c: any) => c.name === 'Debug executable');
      expect(execConfig).toBeDefined();
      expect(execConfig.type).toBe('lldb');
      expect(execConfig.request).toBe('launch');
      expect(execConfig.cargo.filter.kind).toBe('bin');
      expect(execConfig.cwd).toBe('${workspaceFolder}');
    });

    it('should include Debug unit tests configuration', () => {
      const unitTestConfig = config.configurations.find((c: any) => c.name === 'Debug unit tests');
      expect(unitTestConfig).toBeDefined();
      expect(unitTestConfig.cargo.args).toContain('test');
      expect(unitTestConfig.cargo.args).toContain('--no-run');
    });

    it('should include Debug integration tests configuration', () => {
      const integrationTestConfig = config.configurations.find((c: any) => c.name === 'Debug integration tests');
      expect(integrationTestConfig).toBeDefined();
      expect(integrationTestConfig.cargo.args).toContain('--test=*');
      expect(integrationTestConfig.cargo.filter.kind).toBe('test');
    });

    it('should include Debug with args configuration', () => {
      const argsConfig = config.configurations.find((c: any) => c.name === 'Debug with args');
      expect(argsConfig).toBeDefined();
      expect(argsConfig.args).toEqual(['${input:args}']);
    });
  });

  describe('toJSON', () => {
    it('should return formatted JSON string', () => {
      const generator = new LaunchConfigGenerator({ projectType: 'node' });
      const jsonString = generator.toJSON();
      
      expect(() => JSON.parse(jsonString)).not.toThrow();
      
      const parsed = JSON.parse(jsonString);
      expect(parsed.version).toBe('0.2.0');
      expect(Array.isArray(parsed.configurations)).toBe(true);
    });

    it('should format with 2 spaces indentation', () => {
      const generator = new LaunchConfigGenerator({ projectType: 'node' });
      const jsonString = generator.toJSON();
      
      expect(jsonString).toContain('\n  ');
      expect(jsonString).not.toContain('\t');
    });
  });

  describe('Custom entry points', () => {
    it('should use custom entry point for Node.js', () => {
      const generator = new LaunchConfigGenerator({ 
        projectType: 'node',
        entryPoint: 'src/app.js'
      });
      const config = generator.generate();
      
      const launchConfig = config.configurations.find((c: any) => c.name === 'Launch Program');
      expect(launchConfig?.program).toBe('${workspaceFolder}/src/app.js');
    });

    it('should accept custom workspace folder parameter', () => {
      const generator = new LaunchConfigGenerator({ 
        projectType: 'node',
        workspaceFolder: '/custom/workspace',
        entryPoint: 'index.js'
      });
      const config = generator.generate();
      
      // The implementation still uses ${workspaceFolder} VS Code variable
      // The custom workspace folder is stored but not used in the current implementation
      const launchConfig = config.configurations.find((c: any) => c.name === 'Launch Program');
      expect(launchConfig?.program).toBe('${workspaceFolder}/index.js');
    });
  });
});