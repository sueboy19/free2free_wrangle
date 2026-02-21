-- 添加 code_verifier 欄位到 oauth_states 表（用於 PKCE）
ALTER TABLE oauth_states ADD COLUMN code_verifier TEXT;

-- 更新索引
CREATE INDEX IF NOT EXISTS idx_oauth_states_code_verifier ON oauth_states(code_verifier);
