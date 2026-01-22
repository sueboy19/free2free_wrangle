#!/usr/bin/env node

/**
 * E2E 测试运行脚本
 * 自动执行 db:reset，然后运行 Playwright 测试
 */

import { execSync } from 'child_process';

// 解析命令行参数
const args = process.argv.slice(2);
const playwrightArgs = args.join(' ');

try {
  console.log('🔄 重置测试数据库...');
  execSync('npm run db:reset', { stdio: 'inherit' });

  console.log('✅ 数据库重置完成\n');

  console.log('🚀 运行 E2E 测试...');
  const testCommand = `npm run test --prefix frontend/e2e -- ${playwrightArgs}`;
  console.log(`执行命令: ${testCommand}\n`);

  execSync(testCommand, { stdio: 'inherit' });

  console.log('\n✅ E2E 测试完成！');
} catch (error) {
  console.error('\n❌ E2E 测试失败！');
  process.exit(1);
}
