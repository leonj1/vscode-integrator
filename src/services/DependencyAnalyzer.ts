import { readFile } from 'fs/promises';
import { basename } from 'path';

// Types and Interfaces
export interface Dependency {
  name: string;
  version: string;
  type: 'production' | 'development';
}

export interface ParsedDependencies {
  fileName: string;
  fileType: DependencyFileType;
  dependencies: Dependency[];
  totalCount: number;
  productionCount: number;
  developmentCount: number;
}

export type DependencyFileType = 
  | 'package.json'
  | 'requirements.txt'
  | 'go.mod'
  | 'Cargo.toml'
  | 'pom.xml'
  | 'build.gradle';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export class DependencyAnalyzer {
  private dependencies: Dependency[] = [];
  private fileName: string = '';
  private fileType: DependencyFileType | null = null;

  /**
   * Analyzes a dependency file and extracts all dependencies
   * @param filePath Path to the dependency file
   * @returns ParsedDependencies object with unified dependency information
   */
  async analyzeDependencies(filePath: string): Promise<ParsedDependencies> {
    this.fileName = basename(filePath);
    this.dependencies = [];
    
    const fileContent = await readFile(filePath, 'utf-8');
    
    switch (this.fileName) {
      case 'package.json':
        this.fileType = 'package.json';
        await this.parsePackageJson(fileContent);
        break;
      case 'requirements.txt':
        this.fileType = 'requirements.txt';
        await this.parseRequirementsTxt(fileContent);
        break;
      case 'go.mod':
        this.fileType = 'go.mod';
        await this.parseGoMod(fileContent);
        break;
      case 'Cargo.toml':
        this.fileType = 'Cargo.toml';
        await this.parseCargoToml(fileContent);
        break;
      case 'pom.xml':
        this.fileType = 'pom.xml';
        await this.parsePomXml(fileContent);
        break;
      case 'build.gradle':
        this.fileType = 'build.gradle';
        await this.parseBuildGradle(fileContent);
        break;
      default:
        throw new Error(`Unsupported dependency file: ${this.fileName}`);
    }
    
    return this.extractDependencies();
  }

  /**
   * Extracts and returns the parsed dependencies in a unified format
   */
  extractDependencies(): ParsedDependencies {
    const { production, development } = this.getDependenciesByType();
    
    return {
      fileName: this.fileName,
      fileType: this.fileType!,
      dependencies: this.dependencies,
      totalCount: this.dependencies.length,
      productionCount: production.length,
      developmentCount: development.length,
    };
  }

  /**
   * Separates dependencies by type (production vs development)
   */
  getDependenciesByType(): { production: Dependency[]; development: Dependency[] } {
    const production = this.dependencies.filter(dep => dep.type === 'production');
    const development = this.dependencies.filter(dep => dep.type === 'development');
    
    return { production, development };
  }

  /**
   * Parses package.json file (Node.js)
   */
  private async parsePackageJson(content: string): Promise<void> {
    try {
      const packageData: PackageJson = JSON.parse(content);
      
      // Parse production dependencies
      if (packageData.dependencies) {
        for (const [name, version] of Object.entries(packageData.dependencies)) {
          this.dependencies.push({
            name,
            version: this.normalizeVersion(version),
            type: 'production'
          });
        }
      }
      
      // Parse development dependencies
      if (packageData.devDependencies) {
        for (const [name, version] of Object.entries(packageData.devDependencies)) {
          this.dependencies.push({
            name,
            version: this.normalizeVersion(version),
            type: 'development'
          });
        }
      }
      
      // Parse peer dependencies as production
      if (packageData.peerDependencies) {
        for (const [name, version] of Object.entries(packageData.peerDependencies)) {
          this.dependencies.push({
            name,
            version: this.normalizeVersion(version),
            type: 'production'
          });
        }
      }
    } catch (error) {
      throw new Error(`Failed to parse package.json: ${error}`);
    }
  }

  /**
   * Parses requirements.txt file (Python)
   */
  private async parseRequirementsTxt(content: string): Promise<void> {
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    for (const line of lines) {
      // Handle different requirement formats
      const match = line.match(/^([a-zA-Z0-9\-_.]+)\s*([<>=!~]+)?\s*(.*)$/);
      if (match) {
        const [, name, operator = '', version = '*'] = match;
        this.dependencies.push({
          name: name.trim(),
          version: version.trim() || '*',
          type: 'production' // requirements.txt doesn't distinguish dev dependencies
        });
      }
    }
  }

  /**
   * Parses go.mod file (Go)
   */
  private async parseGoMod(content: string): Promise<void> {
    const requireBlock = content.match(/require\s*\(([\s\S]*?)\)/);
    const singleRequires = content.match(/^require\s+(\S+)\s+(\S+)$/gm);
    
    // Parse require block
    if (requireBlock) {
      const requires = requireBlock[1].split('\n').filter(line => line.trim());
      for (const require of requires) {
        const match = require.match(/^\s*(\S+)\s+(\S+)/);
        if (match) {
          const [, name, version] = match;
          this.dependencies.push({
            name: name.trim(),
            version: version.trim(),
            type: 'production'
          });
        }
      }
    }
    
    // Parse single require statements
    if (singleRequires) {
      for (const require of singleRequires) {
        const match = require.match(/^require\s+(\S+)\s+(\S+)$/);
        if (match) {
          const [, name, version] = match;
          this.dependencies.push({
            name: name.trim(),
            version: version.trim(),
            type: 'production'
          });
        }
      }
    }
  }

  /**
   * Parses Cargo.toml file (Rust)
   */
  private async parseCargoToml(content: string): Promise<void> {
    // Parse [dependencies] section
    const depsMatch = content.match(/\[dependencies\]([\s\S]*?)(?:\[|$)/);
    if (depsMatch) {
      this.parseTomlDependencies(depsMatch[1], 'production');
    }
    
    // Parse [dev-dependencies] section
    const devDepsMatch = content.match(/\[dev-dependencies\]([\s\S]*?)(?:\[|$)/);
    if (devDepsMatch) {
      this.parseTomlDependencies(devDepsMatch[1], 'development');
    }
  }

  /**
   * Helper method to parse TOML dependency sections
   */
  private parseTomlDependencies(section: string, type: 'production' | 'development'): void {
    const lines = section.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    for (const line of lines) {
      // Handle both simple and complex dependency formats
      const simpleMatch = line.match(/^(\S+)\s*=\s*"([^"]+)"/);
      const complexMatch = line.match(/^(\S+)\s*=\s*\{.*version\s*=\s*"([^"]+)".*\}/);
      
      if (simpleMatch) {
        const [, name, version] = simpleMatch;
        this.dependencies.push({ name, version, type });
      } else if (complexMatch) {
        const [, name, version] = complexMatch;
        this.dependencies.push({ name, version, type });
      }
    }
  }

  /**
   * Parses pom.xml file (Maven)
   */
  private async parsePomXml(content: string): Promise<void> {
    // Extract dependencies section
    const dependenciesMatch = content.match(/<dependencies>([\s\S]*?)<\/dependencies>/);
    if (!dependenciesMatch) return;
    
    const dependenciesSection = dependenciesMatch[1];
    const dependencyMatches = dependenciesSection.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g);
    
    for (const match of dependencyMatches) {
      const depContent = match[1];
      const groupId = this.extractXmlValue(depContent, 'groupId');
      const artifactId = this.extractXmlValue(depContent, 'artifactId');
      const version = this.extractXmlValue(depContent, 'version') || 'managed';
      const scope = this.extractXmlValue(depContent, 'scope') || 'compile';
      
      if (groupId && artifactId) {
        this.dependencies.push({
          name: `${groupId}:${artifactId}`,
          version,
          type: scope === 'test' ? 'development' : 'production'
        });
      }
    }
  }

  /**
   * Parses build.gradle file (Gradle)
   */
  private async parseBuildGradle(content: string): Promise<void> {
    // Parse dependencies block
    const dependenciesMatch = content.match(/dependencies\s*\{([\s\S]*?)\}/);
    if (!dependenciesMatch) return;
    
    const dependenciesBlock = dependenciesMatch[1];
    const lines = dependenciesBlock.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      // Match different dependency formats
      const matches = [
        line.match(/^\s*(implementation|compile|api|runtimeOnly)\s+['"]([^'"]+)['"]/),
        line.match(/^\s*(testImplementation|testCompile|testRuntimeOnly)\s+['"]([^'"]+)['"]/),
        line.match(/^\s*(implementation|compile|api|runtimeOnly)\s+group:\s*['"]([^'"]+)['"],\s*name:\s*['"]([^'"]+)['"],\s*version:\s*['"]([^'"]+)['"]/),
      ];
      
      for (const match of matches) {
        if (match) {
          if (match.length === 3) {
            // Simple format: implementation 'group:name:version'
            const [, scope, dependency] = match;
            const parts = dependency.split(':');
            const name = parts.length >= 2 ? `${parts[0]}:${parts[1]}` : parts[0];
            const version = parts[2] || 'unspecified';
            
            this.dependencies.push({
              name,
              version,
              type: scope.startsWith('test') ? 'development' : 'production'
            });
          } else if (match.length === 5) {
            // Verbose format
            const [, scope, group, name, version] = match;
            this.dependencies.push({
              name: `${group}:${name}`,
              version,
              type: scope.startsWith('test') ? 'development' : 'production'
            });
          }
        }
      }
    }
  }

  /**
   * Helper method to extract XML values
   */
  private extractXmlValue(xml: string, tag: string): string | null {
    const match = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
    return match ? match[1].trim() : null;
  }

  /**
   * Normalizes version strings by removing common prefixes
   */
  private normalizeVersion(version: string): string {
    return version.replace(/^[\^~]/, '');
  }
}