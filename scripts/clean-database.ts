/**
 * CLI 資料庫清理腳本
 *
 * 使用方式：
 *   npx tsx scripts/clean-database.ts [env]
 *
 * 參數：
 *   env - 環境（可選）：'local'（預設）或 'remote'
 *
 * ⚠️ 此腳本會清空所有資料表，請謹慎使用！
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import readline from 'readline';

// ES modules: get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 從命令行獲取環境參數
const env = process.argv[2] || 'local';

// 驗證環境參數
if (!['local', 'remote'].includes(env)) {
  console.error('❌ 錯誤：環境參數必須是 "local" 或 "remote"');
  console.error('使用方式：npx tsx scripts/clean-database.ts [local|remote]');
  process.exit(1);
}

// 警告提示
if (env === 'remote') {
  console.log('⚠️  警告：您即將清理遠程資料庫！');
  console.log('   此操作將刪除所有資料，無法復原！');
  console.log('');
  console.log('   請確認您想要繼續：');
  console.log('   - 輸入 "YES" 確認執行');
  console.log('   - 任意其他鍵取消');
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('> ', (answer: string) => {
    rl.close();

    if (answer !== 'YES') {
      console.log('❌ 操作已取消');
      process.exit(0);
    }

    executeCleanup(env);
  });
} else {
  console.log('📝 準備清理本地資料庫...');
  executeCleanup(env);
}

function executeCleanup(environment: string) {
  try {
    console.log('');

    // 讀取 SQL 腳本
    const sqlPath = resolve(__dirname, 'reset-test-data.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');

    console.log('✅ 已讀取 SQL 腳本');
    console.log('📊 腳本將執行以下操作：');
    console.log('   - 清空所有資料表');
    console.log('   - 重置 autoincrement 序列');
    console.log('   - 插入測試資料（Mock User A 和 B）');
    console.log('');

    // 構建 wrangler 命令
    const dbBinding = 'DB';
    const envFlag = environment === 'remote' ? '--env production' : '';
    const localFlag = environment === 'local' ? '--local' : '--remote';

    console.log('⏳ 執行資料庫清理...');
    console.log(`   環境：${environment}`);
    console.log(`   Binding：${dbBinding}`);
    console.log('');

    // 執行 wrangler 命令
    const command = `wrangler d1 execute ${dbBinding} ${localFlag} ${envFlag} --file=${sqlPath}`;

    execSync(command, {
      stdio: 'inherit',
      cwd: resolve(__dirname, '..'),
    });

    console.log('');
    console.log('✅ 資料庫清理完成！');
    console.log('');
    console.log('📊 測試資料已插入：');
    console.log('   - 用戶：3 個（Mock User A、Mock User B、Mock User C）');
    console.log('   - 地點：3 個（台北車站、新北板橋、台中車站）');
    console.log('   - 活動：3 個（羽毛球雙打、跑步團、桌派對）');
    console.log('');

    if (environment === 'local') {
      console.log('💡 提示：您可以現在運行測試');
      console.log('   - npm run test');
      console.log('   - npm run test:e2e');
      console.log('   - cd frontend/e2e && npx playwright test');
    }
  } catch (error) {
    console.error('');
    console.error('❌ 資料庫清理失敗！');
    console.error(error);
    process.exit(1);
  }
}
