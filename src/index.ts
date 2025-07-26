#!/usr/bin/env node

import { Command } from 'commander';
import { promises as fs } from 'fs';
import * as path from 'path';
import { ProjectAnalyzer } from './services/ProjectAnalyzer';
import { SimpleDevContainerGenerator } from './services/devcontainer/SimpleDevContainerGenerator';
import { ComplexDevContainerGenerator } from './services/devcontainer/ComplexDevContainerGenerator';
import { DependencyAnalyzer } from './services/DependencyAnalyzer';
import { LaunchConfigGenerator } from './services/vscode/LaunchConfigGenerator';
import { TasksConfigGenerator } from './services/vscode/TasksConfigGenerator';
import { SettingsConfigGenerator } from './services/vscode/SettingsConfigGenerator';
import { DevContainerValidator } from './services/DevContainerValidator';
import { VSCodeIntegrationValidator } from './services/VSCodeIntegrationValidator';

interface Options {
  path?: string;
  force?: boolean;
  devcontainerOnly?: boolean;
  vscodeOnly?: boolean;
  validate?: boolean;
}

const program = new Command();

program
  .name('vscode-integrator')
  .description('Automated DevContainer and VS Code configuration generator')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate DevContainer and/or VS Code configurations')
  .option('-p, --path <path>', 'Project path (defaults to current directory)')
  .option('-f, --force', 'Overwrite existing configurations', false)
  .option('--devcontainer-only', 'Generate only DevContainer configuration', false)
  .option('--vscode-only', 'Generate only VS Code configuration', false)
  .option('--validate', 'Validate the generated configurations', false)
  .action(async (options: Options) => {
    try {
      const projectPath = path.resolve(options.path || process.cwd());
      
      console.log(`🔍 Analyzing project at: ${projectPath}`);
      
      // Analyze the project
      const analyzer = new ProjectAnalyzer(projectPath);
      const projectInfo = await analyzer.analyzeProject();
      
      console.log(`📊 Project Analysis:`);
      console.log(`   Type: ${projectInfo.type}`);
      console.log(`   Languages: ${Object.entries(projectInfo.languages).map(([lang, count]) => `${lang} (${count} files)`).join(', ')}`);
      console.log(`   Total Lines: ${projectInfo.totalLines}`);
      console.log(`   Git Repository: ${projectInfo.isGitRepo ? 'Yes' : 'No'}`);
      
      // Generate DevContainer configuration
      if (!options.vscodeOnly) {
        await generateDevContainer(projectPath, projectInfo, options);
      }
      
      // Generate VS Code configuration
      if (!options.devcontainerOnly) {
        await generateVSCodeConfig(projectPath, projectInfo, options);
      }
      
      // Validate if requested
      if (options.validate) {
        await validateConfigurations(projectPath, projectInfo);
      }
      
      console.log('✅ Configuration generation complete!');
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze a project without generating configurations')
  .option('-p, --path <path>', 'Project path (defaults to current directory)')
  .action(async (options: { path?: string }) => {
    try {
      const projectPath = path.resolve(options.path || process.cwd());
      const analyzer = new ProjectAnalyzer(projectPath);
      const projectInfo = await analyzer.analyzeProject();
      
      console.log(`📊 Project Analysis for: ${projectPath}`);
      console.log(`\n🏷️  Project Type: ${projectInfo.type}`);
      console.log(`\n📝 Languages Detected:`);
      Object.entries(projectInfo.languages)
        .sort(([, a], [, b]) => b - a)
        .forEach(([lang, count]) => {
          console.log(`   - ${lang}: ${count} files`);
        });
      console.log(`\n📏 Total Lines of Code: ${projectInfo.totalLines.toLocaleString()}`);
      console.log(`\n🔗 Git Repository: ${projectInfo.isGitRepo ? 'Yes' : 'No'}`);
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

async function generateDevContainer(
  projectPath: string,
  projectInfo: any,
  options: Options
): Promise<void> {
  console.log('\n🐳 Generating DevContainer configuration...');
  
  const devcontainerPath = path.join(projectPath, '.devcontainer');
  const devcontainerJsonPath = path.join(devcontainerPath, 'devcontainer.json');
  
  // Check if devcontainer.json already exists
  if (!options.force) {
    try {
      await fs.access(devcontainerJsonPath);
      console.log('⚠️  .devcontainer/devcontainer.json already exists. Use --force to overwrite.');
      return;
    } catch {
      // File doesn't exist, continue
    }
  }
  
  // Create .devcontainer directory
  await fs.mkdir(devcontainerPath, { recursive: true });
  
  // Analyze dependencies if needed
  let dependencies = {};
  if (projectInfo.totalLines >= 1000) {
    const depAnalyzer = new DependencyAnalyzer();
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const depResult = await depAnalyzer.analyzeDependencies(packageJsonPath);
      dependencies = depResult.dependencies.reduce((acc, dep) => {
        acc[dep.name] = dep.version;
        return acc;
      }, {} as Record<string, string>);
    } catch (error) {
      // No package.json or other dependency file
    }
  }
  
  // Choose generator based on project complexity
  const generator = projectInfo.totalLines < 1000
    ? new SimpleDevContainerGenerator(projectInfo.type, projectPath)
    : new ComplexDevContainerGenerator(projectInfo.type, projectPath, dependencies);
  
  const config = await generator.generateConfig();
  
  // Write devcontainer.json
  await fs.writeFile(
    devcontainerJsonPath,
    JSON.stringify(config, null, 2)
  );
  
  console.log('✅ Created .devcontainer/devcontainer.json');
  
  // For complex projects, also generate Dockerfile
  if (generator instanceof ComplexDevContainerGenerator) {
    const dockerfile = await generator.generateDockerfile();
    const dockerfilePath = path.join(devcontainerPath, 'Dockerfile');
    await fs.writeFile(dockerfilePath, dockerfile);
    console.log('✅ Created .devcontainer/Dockerfile');
  }
}

async function generateVSCodeConfig(
  projectPath: string,
  projectInfo: any,
  options: Options
): Promise<void> {
  console.log('\n⚙️  Generating VS Code configuration...');
  
  const vscodeDir = path.join(projectPath, '.vscode');
  
  // Create .vscode directory
  await fs.mkdir(vscodeDir, { recursive: true });
  
  // Map project type to generator type
  const projectTypeMap: Record<string, 'node' | 'python' | 'go' | 'java' | 'rust'> = {
    'Node.js': 'node',
    'TypeScript': 'node',
    'Python': 'python',
    'Go': 'go',
    'Java': 'java',
    'Java (Maven)': 'java',
    'Java (Gradle)': 'java',
    'Rust': 'rust'
  };
  
  const generatorType = projectTypeMap[projectInfo.type] || 'node';
  
  // Use actual VS Code config generators
  const launchGen = new LaunchConfigGenerator({ projectType: generatorType });
  const tasksGen = new TasksConfigGenerator({ projectType: generatorType });
  const settingsGen = new SettingsConfigGenerator({ projectType: generatorType });
  
  const configs = [
    { name: 'launch.json', content: await launchGen.generate() },
    { name: 'tasks.json', content: await tasksGen.generate() },
    { name: 'settings.json', content: await settingsGen.generate() }
  ];
  
  for (const config of configs) {
    const configPath = path.join(vscodeDir, config.name);
    
    if (!options.force) {
      try {
        await fs.access(configPath);
        console.log(`⚠️  .vscode/${config.name} already exists. Use --force to overwrite.`);
        continue;
      } catch {
        // File doesn't exist, continue
      }
    }
    
    await fs.writeFile(configPath, JSON.stringify(config.content, null, 2));
    console.log(`✅ Created .vscode/${config.name}`);
  }
}

async function validateConfigurations(
  projectPath: string,
  projectInfo: any
): Promise<void> {
  console.log('\n🔍 Validating configurations...');
  
  // Use actual validators
  const devContainerValidator = new DevContainerValidator(projectPath);
  const vscodeValidator = new VSCodeIntegrationValidator(projectPath);
  
  // Validate DevContainer
  const devContainerReport = await devContainerValidator.validateSetup();
  console.log(`\n📦 DevContainer Validation:`);
  console.log(`   Total Checks: ${devContainerReport.summary.totalChecks}`);
  console.log(`   Passed: ${devContainerReport.summary.passed}`);
  console.log(`   Failed: ${devContainerReport.summary.failed}`);
  console.log(`   Warnings: ${devContainerReport.summary.warnings}`);
  
  // Validate VS Code Integration
  const vscodeReport = await vscodeValidator.testIntegration();
  console.log(`\n🔧 VS Code Integration Validation:`);
  console.log(`   Total Checks: ${vscodeReport.summary.totalChecks}`);
  console.log(`   Passed: ${vscodeReport.summary.passed}`);
  console.log(`   Failed: ${vscodeReport.summary.failed}`);
  console.log(`   Warnings: ${vscodeReport.summary.warnings}`);
  
  // Show any failed validations
  const allFailedResults = [
    ...devContainerReport.results.filter(r => !r.success),
    ...vscodeReport.results.filter(r => !r.success)
  ];
  
  if (allFailedResults.length > 0) {
    console.log(`\n❌ Failed Validations:`);
    allFailedResults.forEach(result => {
      console.log(`   - ${result.message}`);
      result.errors?.forEach(error => {
        console.log(`     • ${error.message}`);
      });
    });
  }
}


// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}