-- 加入品牌欄位（NULL 表示一般活動，非咖啡促銷）
ALTER TABLE activities ADD COLUMN store_brand TEXT;
-- 加入 metadata JSON 欄位（存放外部 API 回傳的促銷資料）
ALTER TABLE activities ADD COLUMN metadata TEXT;

-- 索引：快速查詢咖啡促銷活動
CREATE INDEX IF NOT EXISTS idx_activities_store_brand ON activities(store_brand);
