/**
 * CLI 工具：清理過期的 OAuth 記錄
 * 運行方式：
 * - 本地：npm run cleanup:oauth:local
 * - Staging：npm run cleanup:oauth:staging
 * - Production：npm run cleanup:oauth:prod
 */

const { exec } = require('child_process');

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function cleanupOAuth(env) {
  console.log(`🧹 Cleaning up OAuth records for ${env} environment...\n`);

  try {
    let flag = env === 'local' ? '--local' : '--remote';
    let envFlag = env === 'local' ? '' : `--env ${env}`;

    // 清理過期的 oauth_states
    console.log('Cleaning up expired oauth_states...');
    const { stdout: statesResult } = await runCommand(
      `wrangler d1 execute DB ${flag} ${envFlag} --command='DELETE FROM oauth_states WHERE expires_at < datetime("now")'`
    );
    console.log(statesResult);

    // 清理過期的 oauth_codes
    console.log('\nCleaning up expired oauth_codes...');
    const { stdout: codesResult } = await runCommand(
      `wrangler d1 execute DB ${flag} ${envFlag} --command='DELETE FROM oauth_codes WHERE expires_at < datetime("now")'`
    );
    console.log(codesResult);

    console.log('\n✅ OAuth cleanup completed successfully!\n');
  } catch (error) {
    console.error('\n❌ OAuth cleanup failed:', error);
    process.exit(1);
  }
}

// 獲取命令行參數
const env = process.argv[2];

if (!env || !['local', 'staging', 'production'].includes(env)) {
  console.error('❌ Usage: npm run cleanup:oauth:<local|staging|prod>');
  console.error('   Example: npm run cleanup:oauth:local\n');
  process.exit(1);
}

cleanupOAuth(env);
