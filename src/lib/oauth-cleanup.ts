/**
 * 清理過期的 OAuth 狀態碼和授權碼
 * 使用 CLI 命令運行：npm run cleanup:oauth:local
 */

export async function cleanupExpiredOAuthStates(env: any): Promise<number> {
  try {
    const result = await env.DB.prepare(
      'DELETE FROM oauth_states WHERE expires_at < datetime("now")'
    ).run();

    if (result.meta.changes > 0) {
      console.log(`✅ Cleaned up ${result.meta.changes} expired OAuth states`);
    } else {
      console.log('ℹ️  No expired OAuth states to clean');
    }

    return result.meta.changes;
  } catch (error) {
    console.error('❌ Failed to cleanup OAuth states:', error);
    throw error;
  }
}

export async function cleanupExpiredOAuthCodes(env: any): Promise<number> {
  try {
    const result = await env.DB.prepare(
      'DELETE FROM oauth_codes WHERE expires_at < datetime("now")'
    ).run();

    if (result.meta.changes > 0) {
      console.log(`✅ Cleaned up ${result.meta.changes} expired OAuth codes`);
    } else {
      console.log('ℹ️  No expired OAuth codes to clean');
    }

    return result.meta.changes;
  } catch (error) {
    console.error('❌ Failed to cleanup OAuth codes:', error);
    throw error;
  }
}

export async function cleanupAllExpiredRecords(
  env: any
): Promise<{ states: number; codes: number }> {
  try {
    const [states, codes] = await Promise.all([
      cleanupExpiredOAuthStates(env),
      cleanupExpiredOAuthCodes(env),
    ]);

    console.log(`\n🎯 Cleanup summary: ${states} states, ${codes} codes removed\n`);

    return { states, codes };
  } catch (error) {
    console.error('❌ Failed to cleanup expired records:', error);
    throw error;
  }
}
