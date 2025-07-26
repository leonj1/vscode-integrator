import * as fs from 'fs/promises';
import * as path from 'path';

export class FileUtils {
  /**
   * Check if a file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a directory exists
   */
  static async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Read and parse a JSON file
   */
  static async readJsonFile<T = any>(filePath: string): Promise<T> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to read JSON file ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Write a JSON file
   */
  static async writeJsonFile<T = any>(
    filePath: string,
    data: T,
    indent: number = 2
  ): Promise<void> {
    try {
      const content = JSON.stringify(data, null, indent);
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to write JSON file ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Find files matching a pattern
   */
  static async findFiles(
    directory: string,
    pattern: RegExp,
    options?: {
      recursive?: boolean;
      maxDepth?: number;
    }
  ): Promise<string[]> {
    const results: string[] = [];
    const { recursive = true, maxDepth = 10 } = options || {};

    async function search(dir: string, depth: number) {
      if (depth > maxDepth) return;

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory() && recursive) {
            await search(fullPath, depth + 1);
          } else if (entry.isFile() && pattern.test(entry.name)) {
            results.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore directories we can't read
        console.warn(`Cannot read directory ${dir}: ${error}`);
      }
    }

    await search(directory, 0);
    return results;
  }

  /**
   * Ensure a directory exists, creating it if necessary
   */
  static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Copy a file
   */
  static async copyFile(source: string, destination: string): Promise<void> {
    try {
      await fs.copyFile(source, destination);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to copy file from ${source} to ${destination}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get file stats
   */
  static async getFileStats(filePath: string): Promise<{
    size: number;
    createdAt: Date;
    modifiedAt: Date;
    isDirectory: boolean;
    isFile: boolean;
  }> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get stats for ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Calculate relative path from one file to another
   */
  static getRelativePath(from: string, to: string): string {
    return path.relative(from, to);
  }

  /**
   * Get the absolute path
   */
  static getAbsolutePath(filePath: string): string {
    return path.resolve(filePath);
  }

  /**
   * Parse a file path into its components
   */
  static parsePath(filePath: string): {
    root: string;
    dir: string;
    base: string;
    ext: string;
    name: string;
  } {
    return path.parse(filePath);
  }
}