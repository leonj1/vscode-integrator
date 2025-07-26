export interface SettingsConfiguration {
  [key: string]: any;
}

export interface SettingsGeneratorOptions {
  projectType: 'node' | 'python' | 'go' | 'java' | 'rust';
  includeFormatters?: boolean;
  includeLinters?: boolean;
  includeFileAssociations?: boolean;
  customSettings?: Record<string, any>;
}

export class SettingsConfigGenerator {
  private projectType: string;
  private includeFormatters: boolean;
  private includeLinters: boolean;
  private includeFileAssociations: boolean;
  private customSettings: Record<string, any>;

  constructor(options: SettingsGeneratorOptions) {
    this.projectType = options.projectType;
    this.includeFormatters = options.includeFormatters !== false;
    this.includeLinters = options.includeLinters !== false;
    this.includeFileAssociations = options.includeFileAssociations !== false;
    this.customSettings = options.customSettings || {};
  }

  generate(): SettingsConfiguration {
    const baseSettings = this.getBaseSettings();
    const languageSettings = this.getLanguageSpecificSettings();
    const formatterSettings = this.includeFormatters ? this.getFormatterSettings() : {};
    const linterSettings = this.includeLinters ? this.getLinterSettings() : {};
    const fileAssociations = this.includeFileAssociations ? this.getFileAssociations() : {};
    
    return {
      ...baseSettings,
      ...languageSettings,
      ...formatterSettings,
      ...linterSettings,
      ...fileAssociations,
      ...this.customSettings
    };
  }

  private getBaseSettings(): SettingsConfiguration {
    return {
      'editor.formatOnSave': true,
      'editor.formatOnPaste': true,
      'editor.minimap.enabled': true,
      'editor.rulers': [80, 120],
      'editor.renderWhitespace': 'trailing',
      'editor.suggestSelection': 'first',
      'editor.tabSize': 2,
      'editor.insertSpaces': true,
      'editor.trimAutoWhitespace': true,
      'files.trimTrailingWhitespace': true,
      'files.insertFinalNewline': true,
      'files.exclude': {
        '**/.git': true,
        '**/.DS_Store': true,
        '**/node_modules': true,
        '**/__pycache__': true,
        '**/*.pyc': true,
        '**/target': true,
        '**/build': true,
        '**/dist': true,
        '**/.idea': true,
        '**/.vscode': false
      },
      'search.exclude': {
        '**/node_modules': true,
        '**/bower_components': true,
        '**/*.code-search': true,
        '**/target': true,
        '**/build': true,
        '**/dist': true,
        '**/.git': true
      },
      'terminal.integrated.defaultProfile.linux': 'bash',
      'terminal.integrated.defaultProfile.osx': 'zsh',
      'terminal.integrated.defaultProfile.windows': 'PowerShell'
    };
  }

  private getLanguageSpecificSettings(): SettingsConfiguration {
    switch (this.projectType) {
      case 'node':
        return this.getNodeSettings();
      case 'python':
        return this.getPythonSettings();
      case 'go':
        return this.getGoSettings();
      case 'java':
        return this.getJavaSettings();
      case 'rust':
        return this.getRustSettings();
      default:
        return {};
    }
  }

  private getNodeSettings(): SettingsConfiguration {
    return {
      'editor.tabSize': 2,
      'editor.codeActionsOnSave': {
        'source.fixAll.eslint': true
      },
      '[javascript]': {
        'editor.defaultFormatter': 'esbenp.prettier-vscode'
      },
      '[typescript]': {
        'editor.defaultFormatter': 'esbenp.prettier-vscode'
      },
      '[json]': {
        'editor.defaultFormatter': 'esbenp.prettier-vscode'
      },
      '[jsonc]': {
        'editor.defaultFormatter': 'esbenp.prettier-vscode'
      },
      'typescript.updateImportsOnFileMove.enabled': 'always',
      'javascript.updateImportsOnFileMove.enabled': 'always',
      'typescript.preferences.importModuleSpecifier': 'relative',
      'javascript.preferences.importModuleSpecifier': 'relative',
      'typescript.preferences.quoteStyle': 'single',
      'javascript.preferences.quoteStyle': 'single',
      'npm.enableRunFromFolder': true,
      'npm.packageManager': 'auto'
    };
  }

  private getPythonSettings(): SettingsConfiguration {
    return {
      'editor.tabSize': 4,
      '[python]': {
        'editor.defaultFormatter': 'ms-python.black-formatter',
        'editor.formatOnType': true,
        'editor.codeActionsOnSave': {
          'source.organizeImports': true
        }
      },
      'python.defaultInterpreterPath': 'python',
      'python.linting.enabled': true,
      'python.linting.pylintEnabled': true,
      'python.linting.flake8Enabled': false,
      'python.linting.mypyEnabled': true,
      'python.linting.banditEnabled': false,
      'python.formatting.provider': 'none',
      'python.testing.pytestEnabled': true,
      'python.testing.unittestEnabled': false,
      'python.testing.autoTestDiscoverOnSaveEnabled': true,
      'python.analysis.typeCheckingMode': 'basic',
      'python.analysis.autoImportCompletions': true,
      'python.analysis.autoSearchPaths': true
    };
  }

  private getGoSettings(): SettingsConfiguration {
    return {
      'editor.tabSize': 4,
      'editor.insertSpaces': false,
      '[go]': {
        'editor.formatOnSave': true,
        'editor.codeActionsOnSave': {
          'source.organizeImports': true
        },
        'editor.suggest.snippetsPreventQuickSuggestions': false
      },
      'go.useLanguageServer': true,
      'go.lintOnSave': 'package',
      'go.lintTool': 'golangci-lint',
      'go.formatTool': 'goimports',
      'go.testOnSave': false,
      'go.coverOnSave': false,
      'go.testFlags': ['-v'],
      'go.testTimeout': '30s',
      'go.buildOnSave': 'off',
      'go.buildFlags': [],
      'go.generateTestsFlags': [],
      'go.toolsManagement.autoUpdate': true,
      'gopls': {
        'experimentalPostfixCompletions': true,
        'analyses': {
          'unusedparams': true,
          'shadow': true
        },
        'staticcheck': true
      }
    };
  }

  private getJavaSettings(): SettingsConfiguration {
    return {
      'editor.tabSize': 4,
      '[java]': {
        'editor.defaultFormatter': 'redhat.java',
        'editor.suggest.snippetsPreventQuickSuggestions': false
      },
      'java.configuration.updateBuildConfiguration': 'automatic',
      'java.compile.nullAnalysis.mode': 'automatic',
      'java.format.settings.profile': 'GoogleStyle',
      'java.format.settings.url': 'https://raw.githubusercontent.com/google/styleguide/gh-pages/eclipse-java-google-style.xml',
      'java.saveActions.organizeImports': true,
      'java.completion.importOrder': [
        'java',
        'javax',
        'com',
        'org'
      ],
      'java.sources.organizeImports.starThreshold': 5,
      'java.sources.organizeImports.staticStarThreshold': 3,
      'java.codeGeneration.generateComments': true,
      'java.codeGeneration.hashCodeEquals.useJava7Objects': true,
      'java.configuration.runtimes': [],
      'java.debug.settings.enableRunDebugCodeLens': true,
      'java.test.config': {
        'workingDirectory': '${workspaceFolder}'
      }
    };
  }

  private getRustSettings(): SettingsConfiguration {
    return {
      'editor.tabSize': 4,
      '[rust]': {
        'editor.defaultFormatter': 'rust-lang.rust-analyzer',
        'editor.formatOnSave': true
      },
      'rust-analyzer.check.command': 'clippy',
      'rust-analyzer.cargo.buildScripts.enable': true,
      'rust-analyzer.procMacro.enable': true,
      'rust-analyzer.cargo.features': [],
      'rust-analyzer.inlayHints.chainingHints.enable': true,
      'rust-analyzer.inlayHints.closingBraceHints.enable': true,
      'rust-analyzer.inlayHints.typeHints.enable': true,
      'rust-analyzer.inlayHints.parameterHints.enable': true,
      'rust-analyzer.lens.enable': true,
      'rust-analyzer.lens.implementations.enable': true,
      'rust-analyzer.lens.run.enable': true,
      'rust-analyzer.lens.debug.enable': true,
      'rust-analyzer.completion.addCallArgumentSnippets': true,
      'rust-analyzer.completion.addCallParenthesis': true,
      'rust-analyzer.completion.postfix.enable': true,
      'rust-analyzer.diagnostics.enable': true,
      'rust-analyzer.diagnostics.experimental.enable': false,
      'rust-analyzer.hover.actions.enable': true
    };
  }

  private getFormatterSettings(): SettingsConfiguration {
    const formatters: Record<string, SettingsConfiguration> = {
      node: {
        'prettier.semi': true,
        'prettier.singleQuote': true,
        'prettier.tabWidth': 2,
        'prettier.trailingComma': 'es5',
        'prettier.printWidth': 100,
        'prettier.arrowParens': 'always',
        'prettier.endOfLine': 'lf'
      },
      python: {
        'black-formatter.args': ['--line-length', '88'],
        'isort.args': ['--profile', 'black']
      },
      go: {
        // Go formatter settings are handled by go.formatTool
      },
      java: {
        // Java formatter settings are handled by java.format.settings
      },
      rust: {
        // Rust formatter settings are handled by rustfmt.toml
      }
    };

    return formatters[this.projectType] || {};
  }

  private getLinterSettings(): SettingsConfiguration {
    const linters: Record<string, SettingsConfiguration> = {
      node: {
        'eslint.validate': [
          'javascript',
          'javascriptreact',
          'typescript',
          'typescriptreact'
        ],
        'eslint.format.enable': true,
        'eslint.lintTask.enable': true,
        'eslint.run': 'onType',
        'eslint.codeActionsOnSave.mode': 'all'
      },
      python: {
        'python.linting.pylintArgs': [
          '--load-plugins=pylint_django',
          '--disable=C0111'
        ],
        'python.linting.flake8Args': [
          '--max-line-length=88',
          '--extend-ignore=E203,W503'
        ],
        'python.linting.mypyArgs': [
          '--ignore-missing-imports',
          '--follow-imports=silent',
          '--show-column-numbers'
        ]
      },
      go: {
        'go.lintFlags': [
          '--fast'
        ]
      },
      java: {
        'java.checkstyle.configuration': '/google_checks.xml',
        'java.checkstyle.autocheck': true
      },
      rust: {
        'rust-analyzer.checkOnSave.command': 'clippy',
        'rust-analyzer.checkOnSave.extraArgs': [
          '--',
          '-W',
          'clippy::all'
        ]
      }
    };

    return linters[this.projectType] || {};
  }

  private getFileAssociations(): SettingsConfiguration {
    const associations: Record<string, SettingsConfiguration> = {
      node: {
        'files.associations': {
          '*.js': 'javascript',
          '*.jsx': 'javascriptreact',
          '*.ts': 'typescript',
          '*.tsx': 'typescriptreact',
          '.prettierrc': 'json',
          '.eslintrc': 'json',
          '.babelrc': 'json'
        }
      },
      python: {
        'files.associations': {
          '*.py': 'python',
          '*.pyi': 'python',
          'requirements*.txt': 'pip-requirements',
          'Pipfile': 'toml',
          '.flake8': 'ini'
        }
      },
      go: {
        'files.associations': {
          '*.go': 'go',
          'go.mod': 'go.mod',
          'go.sum': 'go.sum'
        }
      },
      java: {
        'files.associations': {
          '*.java': 'java',
          '*.class': 'java-bytecode',
          'pom.xml': 'xml',
          'build.gradle': 'gradle',
          'settings.gradle': 'gradle'
        }
      },
      rust: {
        'files.associations': {
          '*.rs': 'rust',
          'Cargo.toml': 'toml',
          'Cargo.lock': 'toml'
        }
      }
    };

    return associations[this.projectType] || {};
  }

  toJSON(): string {
    return JSON.stringify(this.generate(), null, 2);
  }
}