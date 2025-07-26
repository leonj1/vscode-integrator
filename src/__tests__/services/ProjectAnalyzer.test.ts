import { ProjectAnalyzer } from '../../services/ProjectAnalyzer';
import { promises as fs } from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
  },
}));

jest.mock('glob', () => ({
  glob: jest.fn(),
}));

// Import glob after mocking
const { glob } = require('glob');

describe('ProjectAnalyzer', () => {
  let analyzer: ProjectAnalyzer;
  const mockProjectPath = '/test/project';

  beforeEach(() => {
    analyzer = new ProjectAnalyzer(mockProjectPath);
    jest.clearAllMocks();
  });

  describe('detectLanguage', () => {
    it('should detect multiple programming languages', async () => {
      const mockFiles = [
        'src/index.ts',
        'src/app.js',
        'tests/test.py',
        'main.go',
        'App.java',
        'styles.css',
      ];

      glob.mockResolvedValue(mockFiles);

      const result = await analyzer.detectLanguage();

      expect(result).toEqual({
        TypeScript: 1,
        JavaScript: 1,
        Python: 1,
        Go: 1,
        Java: 1,
        CSS: 1,
      });
    });

    it('should handle empty projects', async () => {
      glob.mockResolvedValue([]);

      const result = await analyzer.detectLanguage();

      expect(result).toEqual({});
    });

    it('should ignore files in excluded directories', async () => {
      const mockFiles = [
        'src/index.js',
        'node_modules/package/index.js',
        'dist/bundle.js',
        '.git/config',
      ];

      glob.mockResolvedValue(['src/index.js']);

      const result = await analyzer.detectLanguage();

      expect(result).toEqual({
        JavaScript: 1,
      });

      expect(glob).toHaveBeenCalledWith('**/*', expect.objectContaining({
        cwd: mockProjectPath,
        ignore: expect.arrayContaining([
          'node_modules/**',
          '.git/**',
          'dist/**',
        ]),
      }));
    });
  });

  describe('countLinesOfCode', () => {
    it('should count lines in code files', async () => {
      const mockFiles = ['src/index.js', 'src/app.ts', 'README.md'];
      
      glob.mockResolvedValue(mockFiles);
      
      const mockFileContents: Record<string, string> = {
        'src/index.js': 'console.log("Hello");\n\nfunction test() {\n  return true;\n}\n',
        'src/app.ts': 'const x = 1;\nconst y = 2;\n\n// Comment\nconst z = x + y;\n',
        'README.md': '# README\n\nThis is documentation\n',
      };

      (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        const fileName = path.basename(filePath);
        const content = mockFileContents[`src/${fileName}`];
        if (content) {
          return Promise.resolve(content);
        }
        return Promise.reject(new Error('File not found'));
      });

      const result = await analyzer.countLinesOfCode();

      // Should count non-empty lines from .js and .ts files only
      // index.js has 4 non-empty lines, app.ts has 4 non-empty lines
      expect(result).toBe(8);
    });

    it('should handle read errors gracefully', async () => {
      const mockFiles = ['src/index.js'];
      
      glob.mockResolvedValue(mockFiles);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const result = await analyzer.countLinesOfCode();

      expect(result).toBe(0);
    });

    it('should exclude minified files', async () => {
      const mockFiles = ['src/app.js', 'dist/bundle.min.js'];
      
      glob.mockResolvedValue(['src/app.js']);

      const result = await analyzer.countLinesOfCode();

      expect(glob).toHaveBeenCalledWith('**/*', expect.objectContaining({
        ignore: expect.arrayContaining(['**/*.min.js']),
      }));
    });
  });

  describe('isGitRepo', () => {
    it('should return true if .git directory exists', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const result = await analyzer.isGitRepo();

      expect(result).toBe(true);
      expect(fs.access).toHaveBeenCalledWith(path.join(mockProjectPath, '.git'));
    });

    it('should return false if .git directory does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const result = await analyzer.isGitRepo();

      expect(result).toBe(false);
    });
  });

  describe('getProjectType', () => {
    it('should detect Node.js project by package.json', async () => {
      (fs.access as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('package.json')) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await analyzer.getProjectType();

      expect(result).toBe('Node.js');
    });

    it('should detect Python project by requirements.txt', async () => {
      (fs.access as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('requirements.txt')) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await analyzer.getProjectType();

      expect(result).toBe('Python');
    });

    it('should detect Go project by go.mod', async () => {
      (fs.access as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('go.mod')) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await analyzer.getProjectType();

      expect(result).toBe('Go');
    });

    it('should detect Java Maven project by pom.xml', async () => {
      (fs.access as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('pom.xml')) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await analyzer.getProjectType();

      expect(result).toBe('Java (Maven)');
    });

    it('should detect C# project by .csproj files', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      glob.mockImplementation((pattern: string | string[], options?: any) => {
        if (pattern === '*.csproj') {
          return Promise.resolve(['MyApp.csproj'] as any);
        }
        return Promise.resolve([] as any);
      });

      const result = await analyzer.getProjectType();

      expect(result).toBe('C#/.NET');
    });

    it('should fallback to dominant language if no project file found', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      glob.mockImplementation((pattern: string | string[], options?: any) => {
        if (pattern === '**/*') {
          return Promise.resolve(['main.py', 'utils.py', 'test.py', 'config.js'] as any);
        }
        return Promise.resolve([] as any);
      });

      const result = await analyzer.getProjectType();

      expect(result).toBe('Python Project');
    });

    it('should return Unknown for empty projects', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      glob.mockResolvedValue([]);

      const result = await analyzer.getProjectType();

      expect(result).toBe('Unknown');
    });
  });

  describe('analyzeProject', () => {
    it('should return complete project information', async () => {
      // Mock for detectLanguage
      glob.mockImplementation((pattern: string | string[], options?: any) => {
        if (pattern === '**/*') {
          return Promise.resolve(['index.js', 'app.ts'] as any);
        }
        return Promise.resolve([] as any);
      });

      // Mock for countLinesOfCode
      (fs.readFile as jest.Mock).mockResolvedValue('line1\nline2\nline3\n');

      // Mock for isGitRepo
      (fs.access as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('.git')) {
          return Promise.resolve(undefined);
        }
        if (filePath.endsWith('package.json')) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await analyzer.analyzeProject();

      expect(result).toEqual({
        type: 'Node.js',
        languages: {
          JavaScript: 1,
          TypeScript: 1,
        },
        totalLines: 6, // 3 lines * 2 files
        isGitRepo: true,
      });
    });
  });
});