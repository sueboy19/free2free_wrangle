/**
 * 測試資料重置腳本：清空所有資料並插入標準化的測試資料
 *
 * 使用方式：
 *   wrangler d1 execute DB --local --file=./scripts/reset-test-data.sql
 *
 * ⚠️ 此腳本會清空所有資料表，請謹慎使用！
 */

PRAGMA foreign_keys = OFF;

-- 清空所有資料表（按依賴順序）
DELETE FROM review_likes;
DELETE FROM reviews;
DELETE FROM match_participants;
DELETE FROM matches;
DELETE FROM activities;
DELETE FROM locations;
DELETE FROM refresh_tokens;
DELETE FROM users;
DELETE FROM admins;
DELETE FROM sessions;

-- 重置 autoincrement 序列
DELETE FROM sqlite_sequence WHERE name IN ('users', 'locations', 'activities', 'matches', 'match_participants', 'reviews', 'review_likes', 'refresh_tokens', 'admins', 'sessions');

PRAGMA foreign_keys = ON;

-- 插入測試資料（按依賴順序）

-- Admins
INSERT INTO admins (username, email) VALUES ('admin', 'admin@free2free.com');

-- Users（統一使用 mock_user_1 和 mock_user_2）
-- Mock User A（開局者）：test_user_1
-- Mock User B（參與者）：test_user_2
INSERT INTO users (social_id, social_provider, name, email, avatar_url, is_admin) VALUES
  ('test_user_1', 'facebook', '測試用戶 A (開局者)', 'test_user_1@example.com', 'https://example.com/avatar1.jpg', 0),
  ('test_user_2', 'facebook', '測試用戶 B (參與者)', 'test_user_2@example.com', 'https://example.com/avatar2.jpg', 0),
  ('test_user_3', 'facebook', '測試用戶 C', 'test_user_3@example.com', 'https://example.com/avatar3.jpg', 0);

-- Locations
INSERT INTO locations (name, address, latitude, longitude) VALUES
  ('台北車站', '台北市中正區北平西路3號', 25.0479, 121.5170),
  ('新北板橋', '新北市板橋區縣民大道二段7號', 25.0124, 121.4635),
  ('台中車站', '台中市東區台灣大道一段1號', 24.1477, 120.6736);

-- Activities（created_by 參考 users id=1）
INSERT INTO activities (title, target_count, location_id, description, created_by) VALUES
  ('羽毛球雙打', 4, 1, '週末羽毛球雙打，歡迎初學者', 1),
  ('跑步團', 10, 2, '週末晨跑，配速 5:30-6:00', 1),
  ('桌派對', 6, 3, '歡迎所有桌派對愛好者參加', 1);

-- Refresh Tokens（測用）
INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES
  (1, 'test-refresh-token-user1', datetime('now', '+7 days'), datetime('now')),
  (2, 'test-refresh-token-user2', datetime('now', '+7 days'), datetime('now'));
