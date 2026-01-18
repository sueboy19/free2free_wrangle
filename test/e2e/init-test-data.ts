/**
 * 初始化测试数据库
 *
 * 通过 wrangler d1 execute 直接插入测试数据
 */

import { execSync } from 'child_process';

console.log('初始化测试数据库...\n');

// 1. 插入测试 location
console.log('1. 插入测试 location...');
execSync(
  "wrangler d1 execute DB --local --command \"INSERT INTO locations (name, address, latitude, longitude) VALUES ('测试地点', '测试地址', 25.0479, 121.5170)\"",
  { stdio: 'inherit' }
);
console.log('✓ 测试 location 插入完成');

// 2. 插入测试 activity（location_id=1, target_count=10）
console.log('2. 插入测试 activity...');
execSync(
  "wrangler d1 execute DB --local --command \"INSERT INTO activities (title, target_count, location_id, description) VALUES ('测试活动', 10, 1, '测试活动描述')\"",
  { stdio: 'inherit' }
);
console.log('✓ 测试 activity 插入完成');

console.log('\n✓ 测试数据库初始化完成！');
console.log('Activity ID: 1 (使用 activity_id=1)');
console.log('Location ID: 1 (使用 location_id=1)');
