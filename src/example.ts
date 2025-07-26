/**
 * Example usage of the VSCode Integration validators
 */

import { DevContainerValidator } from './services/DevContainerValidator';
import { VSCodeIntegrationValidator } from './services/VSCodeIntegrationValidator';
import { ValidationUtils } from './utils/ValidationUtils';

async function runValidation(projectPath: string) {
  console.log('🔍 Starting VSCode Integration Validation\n');
  console.log(`Project path: ${projectPath}\n`);

  // Initialize validators
  const devContainerValidator = new DevContainerValidator(projectPath);
  const vscodeValidator = new VSCodeIntegrationValidator(projectPath);

  try {
    // Run DevContainer validation
    console.log('=== DevContainer Validation ===');
    const devContainerReport = await devContainerValidator.validateSetup();
    
    console.log('\nDevContainer Validation Summary:');
    console.log(`✅ Passed: ${devContainerReport.summary.passed}`);
    console.log(`❌ Failed: ${devContainerReport.summary.failed}`);
    console.log(`⚠️  Warnings: ${devContainerReport.summary.warnings}`);
    console.log(`⏱️  Duration: ${devContainerReport.duration}ms`);

    // Print detailed results
    devContainerReport.results.forEach((result) => {
      console.log('\n' + ValidationUtils.formatResult(result));
    });

    if (devContainerReport.recommendations) {
      console.log('\n📋 Recommendations:');
      devContainerReport.recommendations.forEach((rec) => {
        console.log(`  • ${rec}`);
      });
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Run VSCode Integration validation
    console.log('=== VSCode Integration Validation ===');
    const vscodeReport = await vscodeValidator.testIntegration();
    
    console.log('\nVSCode Integration Summary:');
    console.log(`✅ Passed: ${vscodeReport.summary.passed}`);
    console.log(`❌ Failed: ${vscodeReport.summary.failed}`);
    console.log(`⚠️  Warnings: ${vscodeReport.summary.warnings}`);
    console.log(`⏱️  Duration: ${vscodeReport.duration}ms`);

    // Print detailed results
    vscodeReport.results.forEach((result) => {
      console.log('\n' + ValidationUtils.formatResult(result));
    });

    if (vscodeReport.recommendations) {
      console.log('\n📋 Recommendations:');
      vscodeReport.recommendations.forEach((rec) => {
        console.log(`  • ${rec}`);
      });
    }

    // Overall summary
    console.log('\n' + '='.repeat(50) + '\n');
    console.log('🎯 Overall Summary:');
    
    const totalPassed = devContainerReport.summary.passed + vscodeReport.summary.passed;
    const totalFailed = devContainerReport.summary.failed + vscodeReport.summary.failed;
    const totalWarnings = devContainerReport.summary.warnings + vscodeReport.summary.warnings;
    
    console.log(`Total checks: ${totalPassed + totalFailed}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Warnings: ${totalWarnings}`);
    
    if (totalFailed === 0) {
      console.log('\n✨ All validations passed! Your VSCode integration is properly configured.');
    } else {
      console.log('\n❗ Some validations failed. Please review the errors above.');
    }

  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    process.exit(1);
  } finally {
    // Cleanup resources
    await devContainerValidator.cleanup();
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  const projectPath = process.argv[2] || process.cwd();
  
  runValidation(projectPath).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runValidation };