import { SettingsConfigGenerator, SettingsGeneratorOptions } from '../SettingsConfigGenerator';

describe('SettingsConfigGenerator', () => {
  describe('constructor', () => {
    it('should initialize with provided options', () => {
      const options: SettingsGeneratorOptions = {
        projectType: 'node',
        includeFormatters: true,
        includeLinters: true,
        includeFileAssociations: true,
        customSettings: { 'custom.setting': true }
      };
      const generator = new SettingsConfigGenerator(options);
      expect(generator).toBeInstanceOf(SettingsConfigGenerator);
    });

    it('should default to including all settings when not specified', () => {
      const options: SettingsGeneratorOptions = { projectType: 'python' };
      const generator = new SettingsConfigGenerator(options);
      const settings = generator.generate();
      
      // Should include formatter settings (black-formatter.args)
      expect(settings['black-formatter.args']).toBeDefined();
      // Should include linter settings
      expect(settings['python.linting.pylintArgs']).toBeDefined();
      // Should include file associations
      expect(settings['files.associations']).toBeDefined();
    });
  });

  describe('generate', () => {
    it('should include base settings for all project types', () => {
      const generator = new SettingsConfigGenerator({ projectType: 'node' });
      const settings = generator.generate();
      
      expect(settings['editor.formatOnSave']).toBe(true);
      expect(settings['editor.formatOnPaste']).toBe(true);
      expect(settings['editor.minimap.enabled']).toBe(true);
      expect(settings['editor.rulers']).toEqual([80, 120]);
      expect(settings['files.trimTrailingWhitespace']).toBe(true);
      expect(settings['files.insertFinalNewline']).toBe(true);
    });

    it('should include file exclusions', () => {
      const generator = new SettingsConfigGenerator({ projectType: 'node' });
      const settings = generator.generate();
      
      expect(settings['files.exclude']).toBeDefined();
      expect(settings['files.exclude']['**/node_modules']).toBe(true);
      expect(settings['files.exclude']['**/.git']).toBe(true);
      expect(settings['search.exclude']).toBeDefined();
    });

    it('should include terminal settings', () => {
      const generator = new SettingsConfigGenerator({ projectType: 'node' });
      const settings = generator.generate();
      
      expect(settings['terminal.integrated.defaultProfile.linux']).toBe('bash');
      expect(settings['terminal.integrated.defaultProfile.osx']).toBe('zsh');
      expect(settings['terminal.integrated.defaultProfile.windows']).toBe('PowerShell');
    });

    it('should merge custom settings', () => {
      const customSettings = {
        'editor.fontSize': 14,
        'custom.setting': true
      };
      const generator = new SettingsConfigGenerator({ 
        projectType: 'node',
        customSettings
      });
      const settings = generator.generate();
      
      expect(settings['editor.fontSize']).toBe(14);
      expect(settings['custom.setting']).toBe(true);
    });

    it('should override base settings with custom settings', () => {
      const generator = new SettingsConfigGenerator({ 
        projectType: 'node',
        customSettings: { 'editor.tabSize': 4 }
      });
      const settings = generator.generate();
      
      expect(settings['editor.tabSize']).toBe(4);
    });
  });

  describe('Node.js settings', () => {
    let generator: SettingsConfigGenerator;
    let settings: any;

    beforeEach(() => {
      generator = new SettingsConfigGenerator({ projectType: 'node' });
      settings = generator.generate();
    });

    it('should set tabSize to 2', () => {
      expect(settings['editor.tabSize']).toBe(2);
    });

    it('should configure ESLint code actions', () => {
      expect(settings['editor.codeActionsOnSave']['source.fixAll.eslint']).toBe(true);
    });

    it('should set Prettier as default formatter for JS/TS files', () => {
      expect(settings['[javascript]']['editor.defaultFormatter']).toBe('esbenp.prettier-vscode');
      expect(settings['[typescript]']['editor.defaultFormatter']).toBe('esbenp.prettier-vscode');
      expect(settings['[json]']['editor.defaultFormatter']).toBe('esbenp.prettier-vscode');
    });

    it('should configure TypeScript/JavaScript settings', () => {
      expect(settings['typescript.updateImportsOnFileMove.enabled']).toBe('always');
      expect(settings['javascript.updateImportsOnFileMove.enabled']).toBe('always');
      expect(settings['typescript.preferences.quoteStyle']).toBe('single');
      expect(settings['javascript.preferences.quoteStyle']).toBe('single');
    });

    it('should include Prettier formatter settings', () => {
      expect(settings['prettier.semi']).toBe(true);
      expect(settings['prettier.singleQuote']).toBe(true);
      expect(settings['prettier.tabWidth']).toBe(2);
      expect(settings['prettier.trailingComma']).toBe('es5');
    });

    it('should include ESLint linter settings', () => {
      expect(settings['eslint.validate']).toContain('javascript');
      expect(settings['eslint.validate']).toContain('typescript');
      expect(settings['eslint.run']).toBe('onType');
    });

    it('should include Node.js file associations', () => {
      expect(settings['files.associations']['*.ts']).toBe('typescript');
      expect(settings['files.associations']['.eslintrc']).toBe('json');
    });
  });

  describe('Python settings', () => {
    let generator: SettingsConfigGenerator;
    let settings: any;

    beforeEach(() => {
      generator = new SettingsConfigGenerator({ projectType: 'python' });
      settings = generator.generate();
    });

    it('should set tabSize to 4', () => {
      expect(settings['editor.tabSize']).toBe(4);
    });

    it('should configure Python formatter', () => {
      expect(settings['[python]']['editor.defaultFormatter']).toBe('ms-python.black-formatter');
      expect(settings['[python]']['editor.formatOnType']).toBe(true);
      expect(settings['[python]']['editor.codeActionsOnSave']['source.organizeImports']).toBe(true);
    });

    it('should configure Python linting', () => {
      expect(settings['python.linting.enabled']).toBe(true);
      expect(settings['python.linting.pylintEnabled']).toBe(true);
      expect(settings['python.linting.mypyEnabled']).toBe(true);
    });

    it('should configure Python testing', () => {
      expect(settings['python.testing.pytestEnabled']).toBe(true);
      expect(settings['python.testing.unittestEnabled']).toBe(false);
      expect(settings['python.testing.autoTestDiscoverOnSaveEnabled']).toBe(true);
    });

    it('should include Black formatter settings', () => {
      expect(settings['black-formatter.args']).toEqual(['--line-length', '88']);
      expect(settings['isort.args']).toEqual(['--profile', 'black']);
    });

    it('should include Python linter settings', () => {
      expect(settings['python.linting.pylintArgs']).toContain('--disable=C0111');
      expect(settings['python.linting.flake8Args']).toContain('--max-line-length=88');
      expect(settings['python.linting.mypyArgs']).toContain('--ignore-missing-imports');
    });

    it('should include Python file associations', () => {
      expect(settings['files.associations']['*.py']).toBe('python');
      expect(settings['files.associations']['requirements*.txt']).toBe('pip-requirements');
    });
  });

  describe('Go settings', () => {
    let generator: SettingsConfigGenerator;
    let settings: any;

    beforeEach(() => {
      generator = new SettingsConfigGenerator({ projectType: 'go' });
      settings = generator.generate();
    });

    it('should set tabSize to 4 with tabs', () => {
      expect(settings['editor.tabSize']).toBe(4);
      expect(settings['editor.insertSpaces']).toBe(false);
    });

    it('should configure Go formatting', () => {
      expect(settings['[go]']['editor.formatOnSave']).toBe(true);
      expect(settings['[go]']['editor.codeActionsOnSave']['source.organizeImports']).toBe(true);
    });

    it('should configure Go tools', () => {
      expect(settings['go.useLanguageServer']).toBe(true);
      expect(settings['go.lintTool']).toBe('golangci-lint');
      expect(settings['go.formatTool']).toBe('goimports');
    });

    it('should configure gopls', () => {
      expect(settings['gopls']['experimentalPostfixCompletions']).toBe(true);
      expect(settings['gopls']['analyses']['unusedparams']).toBe(true);
      expect(settings['gopls']['staticcheck']).toBe(true);
    });

    it('should include Go linter settings', () => {
      expect(settings['go.lintFlags']).toEqual(['--fast']);
    });

    it('should include Go file associations', () => {
      expect(settings['files.associations']['*.go']).toBe('go');
      expect(settings['files.associations']['go.mod']).toBe('go.mod');
    });
  });

  describe('Java settings', () => {
    let generator: SettingsConfigGenerator;
    let settings: any;

    beforeEach(() => {
      generator = new SettingsConfigGenerator({ projectType: 'java' });
      settings = generator.generate();
    });

    it('should set tabSize to 4', () => {
      expect(settings['editor.tabSize']).toBe(4);
    });

    it('should configure Java formatter', () => {
      expect(settings['[java]']['editor.defaultFormatter']).toBe('redhat.java');
      expect(settings['java.format.settings.profile']).toBe('GoogleStyle');
    });

    it('should configure Java import settings', () => {
      expect(settings['java.saveActions.organizeImports']).toBe(true);
      expect(settings['java.completion.importOrder']).toEqual(['java', 'javax', 'com', 'org']);
      expect(settings['java.sources.organizeImports.starThreshold']).toBe(5);
    });

    it('should include Java linter settings', () => {
      expect(settings['java.checkstyle.configuration']).toBe('/google_checks.xml');
      expect(settings['java.checkstyle.autocheck']).toBe(true);
    });

    it('should include Java file associations', () => {
      expect(settings['files.associations']['*.java']).toBe('java');
      expect(settings['files.associations']['pom.xml']).toBe('xml');
      expect(settings['files.associations']['build.gradle']).toBe('gradle');
    });
  });

  describe('Rust settings', () => {
    let generator: SettingsConfigGenerator;
    let settings: any;

    beforeEach(() => {
      generator = new SettingsConfigGenerator({ projectType: 'rust' });
      settings = generator.generate();
    });

    it('should set tabSize to 4', () => {
      expect(settings['editor.tabSize']).toBe(4);
    });

    it('should configure Rust formatter', () => {
      expect(settings['[rust]']['editor.defaultFormatter']).toBe('rust-lang.rust-analyzer');
      expect(settings['[rust]']['editor.formatOnSave']).toBe(true);
    });

    it('should configure rust-analyzer', () => {
      expect(settings['rust-analyzer.check.command']).toBe('clippy');
      expect(settings['rust-analyzer.cargo.buildScripts.enable']).toBe(true);
      expect(settings['rust-analyzer.procMacro.enable']).toBe(true);
    });

    it('should configure rust-analyzer inlay hints', () => {
      expect(settings['rust-analyzer.inlayHints.chainingHints.enable']).toBe(true);
      expect(settings['rust-analyzer.inlayHints.typeHints.enable']).toBe(true);
      expect(settings['rust-analyzer.inlayHints.parameterHints.enable']).toBe(true);
    });

    it('should include Rust linter settings', () => {
      expect(settings['rust-analyzer.checkOnSave.command']).toBe('clippy');
      expect(settings['rust-analyzer.checkOnSave.extraArgs']).toContain('-W');
    });

    it('should include Rust file associations', () => {
      expect(settings['files.associations']['*.rs']).toBe('rust');
      expect(settings['files.associations']['Cargo.toml']).toBe('toml');
    });
  });

  describe('Conditional settings', () => {
    it('should exclude formatter settings when includeFormatters is false', () => {
      const generator = new SettingsConfigGenerator({ 
        projectType: 'node',
        includeFormatters: false
      });
      const settings = generator.generate();
      
      expect(settings['prettier.semi']).toBeUndefined();
      expect(settings['prettier.singleQuote']).toBeUndefined();
    });

    it('should exclude linter settings when includeLinters is false', () => {
      const generator = new SettingsConfigGenerator({ 
        projectType: 'node',
        includeLinters: false
      });
      const settings = generator.generate();
      
      expect(settings['eslint.validate']).toBeUndefined();
      expect(settings['eslint.run']).toBeUndefined();
    });

    it('should exclude file associations when includeFileAssociations is false', () => {
      const generator = new SettingsConfigGenerator({ 
        projectType: 'node',
        includeFileAssociations: false
      });
      const settings = generator.generate();
      
      expect(settings['files.associations']).toBeUndefined();
    });
  });

  describe('toJSON', () => {
    it('should return formatted JSON string', () => {
      const generator = new SettingsConfigGenerator({ projectType: 'node' });
      const jsonString = generator.toJSON();
      
      expect(() => JSON.parse(jsonString)).not.toThrow();
      
      const parsed = JSON.parse(jsonString);
      expect(parsed['editor.formatOnSave']).toBe(true);
    });

    it('should format with 2 spaces indentation', () => {
      const generator = new SettingsConfigGenerator({ projectType: 'node' });
      const jsonString = generator.toJSON();
      
      expect(jsonString).toContain('\n  ');
      expect(jsonString).not.toContain('\t');
    });
  });
});