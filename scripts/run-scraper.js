#!/usr/bin/env node

const { scrapeRegions } = require('./scrape-regions-simple');

console.log('🚀 开始执行行政区划数据抓取...');
console.log('📍 目标网站: https://www.mca.gov.cn/mzsj/xzqh/2023/202301xzqh.html');
console.log('');

scrapeRegions()
  .then(result => {
    console.log('');
    console.log('🎉 抓取完成！');
    console.log(`📁 SQL文件: ${result.sqlPath}`);
    console.log(`📁 JSON文件: ${result.jsonPath}`);
    console.log(`📊 数据条数: ${result.count}`);
    console.log('');
    console.log('💡 使用方法:');
    console.log('   1. 检查生成的SQL文件内容');
    console.log('   2. 在数据库中执行SQL文件');
    console.log('   3. 或者使用JSON文件进行其他处理');
  })
  .catch(error => {
    console.error('');
    console.error('❌ 抓取失败:', error.message);
    console.error('');
    console.error('🔧 可能的解决方案:');
    console.error('   1. 检查网络连接');
    console.error('   2. 确认目标网站可访问');
    console.error('   3. 脚本已自动使用备用数据');
    process.exit(1);
  });