import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';

export interface LanguageStats {
  [language: string]: number;
}

export interface ProjectInfo {
  type: string;
  languages: LanguageStats;
  totalLines: number;
  isGitRepo: boolean;
}

export class ProjectAnalyzer {
  private projectPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
  }

  async detectLanguage(): Promise<LanguageStats> {
    const languageMap: { [ext: string]: string } = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.py': 'Python',
      '.java': 'Java',
      '.go': 'Go',
      '.rs': 'Rust',
      '.cpp': 'C++',
      '.c': 'C',
      '.cs': 'C#',
      '.rb': 'Ruby',
      '.php': 'PHP',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
      '.scala': 'Scala',
      '.r': 'R',
      '.m': 'MATLAB',
      '.jl': 'Julia',
      '.dart': 'Dart',
      '.lua': 'Lua',
      '.pl': 'Perl',
      '.sh': 'Shell',
      '.ps1': 'PowerShell',
      '.sql': 'SQL',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.less': 'LESS',
      '.vue': 'Vue',
      '.svelte': 'Svelte'
    };

    const languageStats: LanguageStats = {};

    try {
      const files = await glob('**/*', {
        cwd: this.projectPath,
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '*.log', '*.lock', 'coverage/**', '.vscode/**', '.idea/**'],
        nodir: true
      });

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        const language = languageMap[ext];
        if (language) {
          languageStats[language] = (languageStats[language] || 0) + 1;
        }
      }
    } catch (error) {
      console.error('Error detecting languages:', error);
    }

    return languageStats;
  }

  async countLinesOfCode(): Promise<number> {
    let totalLines = 0;
    const codeExtensions = new Set([
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs',
      '.cpp', '.c', '.cs', '.rb', '.php', '.swift', '.kt', '.scala',
      '.r', '.m', '.jl', '.dart', '.lua', '.pl', '.sh', '.ps1',
      '.sql', '.html', '.css', '.scss', '.less', '.vue', '.svelte'
    ]);

    try {
      const files = await glob('**/*', {
        cwd: this.projectPath,
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '*.log', '*.lock', 'coverage/**', '.vscode/**', '.idea/**', '**/*.min.js', '**/*.min.css'],
        nodir: true
      });

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (codeExtensions.has(ext)) {
          try {
            const content = await fs.readFile(path.join(this.projectPath, file), 'utf-8');
            const lines = content.split('\n').filter(line => line.trim().length > 0);
            totalLines += lines.length;
          } catch (error) {
            console.error(`Error reading file ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error counting lines of code:', error);
    }

    return totalLines;
  }

  async isGitRepo(): Promise<boolean> {
    try {
      await fs.access(path.join(this.projectPath, '.git'));
      return true;
    } catch {
      return false;
    }
  }

  async getProjectType(): Promise<string> {
    const projectFiles = {
      'package.json': 'Node.js',
      'requirements.txt': 'Python',
      'setup.py': 'Python',
      'pyproject.toml': 'Python',
      'go.mod': 'Go',
      'Cargo.toml': 'Rust',
      'pom.xml': 'Java (Maven)',
      'build.gradle': 'Java (Gradle)',
      'build.gradle.kts': 'Java (Gradle)',
      '*.csproj': 'C#/.NET',
      'composer.json': 'PHP',
      'Gemfile': 'Ruby',
      'Package.swift': 'Swift',
      'pubspec.yaml': 'Dart/Flutter',
      'mix.exs': 'Elixir'
    };

    try {
      for (const [file, projectType] of Object.entries(projectFiles)) {
        if (file.includes('*')) {
          const matches = await glob(file, { cwd: this.projectPath });
          if (matches.length > 0) {
            return projectType;
          }
        } else {
          try {
            await fs.access(path.join(this.projectPath, file));
            return projectType;
          } catch {
            // File doesn't exist, continue checking
          }
        }
      }

      // If no specific project file found, detect by dominant language
      const languages = await this.detectLanguage();
      const sortedLanguages = Object.entries(languages)
        .sort(([, a], [, b]) => b - a);

      if (sortedLanguages.length > 0) {
        const dominantLanguage = sortedLanguages[0][0];
        return `${dominantLanguage} Project`;
      }
    } catch (error) {
      console.error('Error determining project type:', error);
    }

    return 'Unknown';
  }

  async analyzeProject(): Promise<ProjectInfo> {
    const [languages, totalLines, isGitRepo, type] = await Promise.all([
      this.detectLanguage(),
      this.countLinesOfCode(),
      this.isGitRepo(),
      this.getProjectType()
    ]);

    return {
      type,
      languages,
      totalLines,
      isGitRepo
    };
  }
}