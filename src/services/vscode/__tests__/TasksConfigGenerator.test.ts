import { TasksConfigGenerator, TaskGeneratorOptions } from '../TasksConfigGenerator';

describe('TasksConfigGenerator', () => {
  describe('constructor', () => {
    it('should initialize with provided options', () => {
      const options: TaskGeneratorOptions = {
        projectType: 'node',
        packageManager: 'yarn'
      };
      const generator = new TasksConfigGenerator(options);
      expect(generator).toBeInstanceOf(TasksConfigGenerator);
    });

    it('should use default package manager if not provided', () => {
      const options: TaskGeneratorOptions = { projectType: 'python' };
      const generator = new TasksConfigGenerator(options);
      const config = generator.generate();
      
      // Python defaults to pip
      const installTask = config.tasks.find(t => t.label === 'install dependencies');
      expect(installTask?.command).toBe('pip');
    });
  });

  describe('generate', () => {
    it('should generate correct version', () => {
      const generator = new TasksConfigGenerator({ projectType: 'node' });
      const config = generator.generate();
      expect(config.version).toBe('2.0.0');
    });

    it('should return empty tasks for unknown project type', () => {
      const generator = new TasksConfigGenerator({ projectType: 'unknown' as any });
      const config = generator.generate();
      expect(config.tasks).toEqual([]);
    });
  });

  describe('Node.js tasks', () => {
    describe('with npm', () => {
      let generator: TasksConfigGenerator;
      let config: any;

      beforeEach(() => {
        generator = new TasksConfigGenerator({ 
          projectType: 'node',
          packageManager: 'npm'
        });
        config = generator.generate();
      });

      it('should generate 5 Node.js tasks', () => {
        expect(config.tasks).toHaveLength(5);
      });

      it('should include install task', () => {
        const task = config.tasks.find((t: any) => t.label === 'install');
        expect(task).toBeDefined();
        expect(task.type).toBe('shell');
        expect(task.command).toBe('npm');
        expect(task.args).toEqual(['install']);
      });

      it('should include build task', () => {
        const task = config.tasks.find((t: any) => t.label === 'build');
        expect(task).toBeDefined();
        expect(task.type).toBe('npm');
        expect(task.script).toBe('build');
        expect(task.group.kind).toBe('build');
        expect(task.group.isDefault).toBe(true);
        expect(task.problemMatcher).toContain('$tsc');
      });

      it('should include test task', () => {
        const task = config.tasks.find((t: any) => t.label === 'test');
        expect(task).toBeDefined();
        expect(task.type).toBe('npm');
        expect(task.script).toBe('test');
        expect(task.group.kind).toBe('test');
        expect(task.group.isDefault).toBe(true);
        expect(task.isBackground).toBe(true);
      });

      it('should include lint task', () => {
        const task = config.tasks.find((t: any) => t.label === 'lint');
        expect(task).toBeDefined();
        expect(task.type).toBe('npm');
        expect(task.script).toBe('lint');
        expect(task.problemMatcher).toContain('$eslint-stylish');
      });

      it('should include dev task', () => {
        const task = config.tasks.find((t: any) => t.label === 'dev');
        expect(task).toBeDefined();
        expect(task.type).toBe('npm');
        expect(task.script).toBe('dev');
        expect(task.isBackground).toBe(true);
        expect(task.problemMatcher.owner).toBe('typescript');
      });
    });

    describe('with yarn', () => {
      let generator: TasksConfigGenerator;
      let config: any;

      beforeEach(() => {
        generator = new TasksConfigGenerator({ 
          projectType: 'node',
          packageManager: 'yarn'
        });
        config = generator.generate();
      });

      it('should use shell tasks with yarn command', () => {
        const buildTask = config.tasks.find((t: any) => t.label === 'build');
        expect(buildTask.type).toBe('shell');
        expect(buildTask.command).toBe('yarn');
        expect(buildTask.args).toEqual(['run', 'build']);
      });
    });
  });

  describe('Python tasks', () => {
    describe('with pip', () => {
      let generator: TasksConfigGenerator;
      let config: any;

      beforeEach(() => {
        generator = new TasksConfigGenerator({ 
          projectType: 'python',
          packageManager: 'pip'
        });
        config = generator.generate();
      });

      it('should generate 6 Python tasks', () => {
        expect(config.tasks).toHaveLength(6);
      });

      it('should include install dependencies task', () => {
        const task = config.tasks.find((t: any) => t.label === 'install dependencies');
        expect(task).toBeDefined();
        expect(task.command).toBe('pip');
        expect(task.args).toEqual(['install', '-r', 'requirements.txt']);
      });

      it('should include run task', () => {
        const task = config.tasks.find((t: any) => t.label === 'run');
        expect(task).toBeDefined();
        expect(task.command).toBe('${command:python.interpreterPath}');
        expect(task.args).toEqual(['${file}']);
        expect(task.group.kind).toBe('build');
        expect(task.group.isDefault).toBe(true);
      });

      it('should include test task', () => {
        const task = config.tasks.find((t: any) => t.label === 'test');
        expect(task).toBeDefined();
        expect(task.args).toEqual(['-m', 'pytest', '-v']);
      });

      it('should include lint task', () => {
        const task = config.tasks.find((t: any) => t.label === 'lint');
        expect(task).toBeDefined();
        expect(task.args).toEqual(['-m', 'pylint', '**/*.py']);
        expect(task.problemMatcher.pattern.regexp).toBeDefined();
      });

      it('should include format task', () => {
        const task = config.tasks.find((t: any) => t.label === 'format');
        expect(task).toBeDefined();
        expect(task.args).toEqual(['-m', 'black', '.']);
      });

      it('should include type check task', () => {
        const task = config.tasks.find((t: any) => t.label === 'type check');
        expect(task).toBeDefined();
        expect(task.args).toEqual(['-m', 'mypy', '.']);
        expect(task.problemMatcher).toBe('$mypy');
      });
    });

    describe('with poetry', () => {
      let generator: TasksConfigGenerator;
      let config: any;

      beforeEach(() => {
        generator = new TasksConfigGenerator({ 
          projectType: 'python',
          packageManager: 'poetry'
        });
        config = generator.generate();
      });

      it('should use poetry for install task', () => {
        const task = config.tasks.find((t: any) => t.label === 'install dependencies');
        expect(task.command).toBe('poetry');
        expect(task.args).toEqual(['install']);
      });
    });
  });

  describe('Go tasks', () => {
    let generator: TasksConfigGenerator;
    let config: any;

    beforeEach(() => {
      generator = new TasksConfigGenerator({ projectType: 'go' });
      config = generator.generate();
    });

    it('should generate 7 Go tasks', () => {
      expect(config.tasks).toHaveLength(7);
    });

    it('should include build task', () => {
      const task = config.tasks.find((t: any) => t.label === 'build');
      expect(task).toBeDefined();
      expect(task.command).toBe('go');
      expect(task.args).toEqual(['build', '-v', './...']);
      expect(task.group.kind).toBe('build');
      expect(task.group.isDefault).toBe(true);
    });

    it('should include test task', () => {
      const task = config.tasks.find((t: any) => t.label === 'test');
      expect(task).toBeDefined();
      expect(task.args).toEqual(['test', '-v', './...']);
    });

    it('should include fmt task', () => {
      const task = config.tasks.find((t: any) => t.label === 'fmt');
      expect(task).toBeDefined();
      expect(task.args).toEqual(['fmt', './...']);
    });

    it('should include vet task', () => {
      const task = config.tasks.find((t: any) => t.label === 'vet');
      expect(task).toBeDefined();
      expect(task.args).toEqual(['vet', './...']);
    });

    it('should include mod tidy task', () => {
      const task = config.tasks.find((t: any) => t.label === 'mod tidy');
      expect(task).toBeDefined();
      expect(task.args).toEqual(['mod', 'tidy']);
    });

    it('should include test coverage task', () => {
      const task = config.tasks.find((t: any) => t.label === 'test coverage');
      expect(task).toBeDefined();
      expect(task.args).toContain('-coverprofile=coverage.out');
    });
  });

  describe('Java tasks', () => {
    describe('with Maven', () => {
      let generator: TasksConfigGenerator;
      let config: any;

      beforeEach(() => {
        generator = new TasksConfigGenerator({ 
          projectType: 'java',
          packageManager: 'maven'
        });
        config = generator.generate();
      });

      it('should generate 5 Maven tasks', () => {
        expect(config.tasks).toHaveLength(5);
      });

      it('should include compile task', () => {
        const task = config.tasks.find((t: any) => t.label === 'compile');
        expect(task).toBeDefined();
        expect(task.command).toBe('mvn');
        expect(task.args).toEqual(['compile']);
        expect(task.group.kind).toBe('build');
        expect(task.group.isDefault).toBe(true);
      });

      it('should include test task', () => {
        const task = config.tasks.find((t: any) => t.label === 'test');
        expect(task).toBeDefined();
        expect(task.args).toEqual(['test']);
      });

      it('should include package task', () => {
        const task = config.tasks.find((t: any) => t.label === 'package');
        expect(task).toBeDefined();
        expect(task.args).toEqual(['package']);
      });

      it('should include clean task', () => {
        const task = config.tasks.find((t: any) => t.label === 'clean');
        expect(task).toBeDefined();
        expect(task.args).toEqual(['clean']);
      });

      it('should include verify task', () => {
        const task = config.tasks.find((t: any) => t.label === 'verify');
        expect(task).toBeDefined();
        expect(task.args).toEqual(['verify']);
      });
    });

    describe('with Gradle', () => {
      let generator: TasksConfigGenerator;
      let config: any;

      beforeEach(() => {
        generator = new TasksConfigGenerator({ 
          projectType: 'java',
          packageManager: 'gradle'
        });
        config = generator.generate();
      });

      it('should generate 4 Gradle tasks', () => {
        expect(config.tasks).toHaveLength(4);
      });

      it('should include build task with gradlew', () => {
        const task = config.tasks.find((t: any) => t.label === 'build');
        expect(task).toBeDefined();
        expect(task.command).toBe('./gradlew');
        expect(task.windows.command).toBe('.\\gradlew.bat');
        expect(task.args).toEqual(['build']);
      });

      it('should include test task', () => {
        const task = config.tasks.find((t: any) => t.label === 'test');
        expect(task).toBeDefined();
        expect(task.args).toEqual(['test']);
      });

      it('should include run task', () => {
        const task = config.tasks.find((t: any) => t.label === 'run');
        expect(task).toBeDefined();
        expect(task.args).toEqual(['run']);
      });
    });
  });

  describe('Rust tasks', () => {
    let generator: TasksConfigGenerator;
    let config: any;

    beforeEach(() => {
      generator = new TasksConfigGenerator({ projectType: 'rust' });
      config = generator.generate();
    });

    it('should generate 9 Rust tasks', () => {
      expect(config.tasks).toHaveLength(9);
    });

    it('should include build task', () => {
      const task = config.tasks.find((t: any) => t.label === 'build');
      expect(task).toBeDefined();
      expect(task.type).toBe('cargo');
      expect(task.command).toBe('build');
      expect(task.group.kind).toBe('build');
      expect(task.group.isDefault).toBe(true);
    });

    it('should include build release task', () => {
      const task = config.tasks.find((t: any) => t.label === 'build release');
      expect(task).toBeDefined();
      expect(task.args).toEqual(['--release']);
    });

    it('should include test task', () => {
      const task = config.tasks.find((t: any) => t.label === 'test');
      expect(task).toBeDefined();
      expect(task.command).toBe('test');
      expect(task.group.kind).toBe('test');
      expect(task.group.isDefault).toBe(true);
    });

    it('should include clippy task', () => {
      const task = config.tasks.find((t: any) => t.label === 'clippy');
      expect(task).toBeDefined();
      expect(task.args).toEqual(['--', '-D', 'warnings']);
    });

    it('should include fmt task as shell type', () => {
      const task = config.tasks.find((t: any) => t.label === 'fmt');
      expect(task).toBeDefined();
      expect(task.type).toBe('shell');
      expect(task.command).toBe('cargo');
      expect(task.args).toEqual(['fmt']);
    });

    it('should include doc task', () => {
      const task = config.tasks.find((t: any) => t.label === 'doc');
      expect(task).toBeDefined();
      expect(task.args).toEqual(['--open']);
    });
  });

  describe('toJSON', () => {
    it('should return formatted JSON string', () => {
      const generator = new TasksConfigGenerator({ projectType: 'node' });
      const jsonString = generator.toJSON();
      
      expect(() => JSON.parse(jsonString)).not.toThrow();
      
      const parsed = JSON.parse(jsonString);
      expect(parsed.version).toBe('2.0.0');
      expect(Array.isArray(parsed.tasks)).toBe(true);
    });

    it('should format with 2 spaces indentation', () => {
      const generator = new TasksConfigGenerator({ projectType: 'node' });
      const jsonString = generator.toJSON();
      
      expect(jsonString).toContain('\n  ');
      expect(jsonString).not.toContain('\t');
    });
  });
});