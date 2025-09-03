const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class RegionScraper {
  constructor() {
    this.regions = [];
    this.tenantId = 1; // 默认租户ID
    this.baseUrl = 'https://www.mca.gov.cn';
  }

  async scrapeRegions() {
    try {
      console.log('开始抓取行政区划数据...');
      
      // 获取主页面
      const response = await axios.get('https://www.mca.gov.cn/mzsj/xzqh/2023/202301xzqh.html', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // 查找包含行政区划数据的表格或列表
      const tableRows = $('table tr, .MsoNormalTable tr');
      
      if (tableRows.length === 0) {
        // 如果没有找到表格，尝试查找其他格式的数据
        console.log('未找到表格数据，尝试解析其他格式...');
        await this.parseAlternativeFormat($);
      } else {
        await this.parseTableFormat($, tableRows);
      }

      console.log(`共抓取到 ${this.regions.length} 条区域数据`);
      
      // 生成SQL文件
      await this.generateSQLFile();
      
    } catch (error) {
      console.error('抓取失败:', error.message);
      
      // 如果网络抓取失败，使用备用数据
      console.log('使用备用的行政区划数据...');
      await this.generateFallbackData();
    }
  }

  async parseTableFormat($, tableRows) {
    let currentProvince = null;
    let currentCity = null;
    
    tableRows.each((index, row) => {
      const cells = $(row).find('td, th');
      if (cells.length >= 2) {
        const code = $(cells[0]).text().trim();
        const name = $(cells[1]).text().trim();
        
        if (code && name && /^\d+$/.test(code)) {
          const level = this.determineLevel(code);
          
          if (level === 1) { // 省级
            currentProvince = { code, name, level, parentCode: null, parentId: null };
            this.regions.push(currentProvince);
            currentCity = null;
          } else if (level === 2) { // 市级
            if (currentProvince) {
              currentCity = { 
                code, 
                name, 
                level, 
                parentCode: currentProvince.code, 
                parentId: null 
              };
              this.regions.push(currentCity);
            }
          } else if (level === 3) { // 区县级
            // 修正逻辑：区县的上级可能是市，也可能是省（省直辖县）
            const parent = currentCity || currentProvince;
            if (parent) {
              this.regions.push({
                code,
                name,
                level,
                parentCode: parent.code,
                parentId: null
              });
            }
          }
        }
      }
    });
  }

  async parseAlternativeFormat($) {
    // 尝试解析其他可能的数据格式
    const textContent = $('body').text();
    const lines = textContent.split('\n');
    
    let currentProvince = null;
    let currentCity = null;
    
    for (const line of lines) {
      const match = line.match(/(\d{6})\s+(.+)/);
      if (match) {
        const [, code, name] = match;
        const level = this.determineLevel(code);
        
        if (level === 1) {
          currentProvince = { code, name, level, parentCode: null, parentId: null };
          this.regions.push(currentProvince);
          currentCity = null;
        } else if (level === 2) {
          if (currentProvince) {
            currentCity = { 
              code, 
              name, 
              level, 
              parentCode: currentProvince.code, 
              parentId: null 
            };
            this.regions.push(currentCity);
          }
        } else if (level === 3) {
          // 修正逻辑：区县的上级可能是市，也可能是省（省直辖县）
          const parent = currentCity || currentProvince;
          if (parent) {
            this.regions.push({
              code,
              name,
              level,
              parentCode: parent.code,
              parentId: null
            });
          }
        }
      }
    }
  }

  determineLevel(code) {
    // 根据行政区划代码判断级别
    if (code.endsWith('0000')) {
      return 1; // 省级
    } else if (code.endsWith('00')) {
      return 2; // 市级
    } else {
      return 3; // 区县级
    }
  }

  async generateFallbackData() {
    // 备用数据：主要省市区
    const fallbackData = [
      // 北京市
      { code: '110000', name: '北京市', level: 1, parentCode: null, parentId: null },
      { code: '110100', name: '北京市', level: 2, parentCode: '110000', parentId: null },
      { code: '110101', name: '东城区', level: 3, parentCode: '110100', parentId: null },
      { code: '110102', name: '西城区', level: 3, parentCode: '110100', parentId: null },
      { code: '110105', name: '朝阳区', level: 3, parentCode: '110100', parentId: null },
      { code: '110106', name: '丰台区', level: 3, parentCode: '110100', parentId: null },
      
      // 上海市
      { code: '310000', name: '上海市', level: 1, parentCode: null, parentId: null },
      { code: '310100', name: '上海市', level: 2, parentCode: '310000', parentId: null },
      { code: '310101', name: '黄浦区', level: 3, parentCode: '310100', parentId: null },
      { code: '310104', name: '徐汇区', level: 3, parentCode: '310100', parentId: null },
      { code: '310105', name: '长宁区', level: 3, parentCode: '310100', parentId: null },
      
      // 广东省
      { code: '440000', name: '广东省', level: 1, parentCode: null, parentId: null },
      { code: '440100', name: '广州市', level: 2, parentCode: '440000', parentId: null },
      { code: '440103', name: '荔湾区', level: 3, parentCode: '440100', parentId: null },
      { code: '440104', name: '越秀区', level: 3, parentCode: '440100', parentId: null },
      { code: '440300', name: '深圳市', level: 2, parentCode: '440000', parentId: null },
      { code: '440303', name: '罗湖区', level: 3, parentCode: '440300', parentId: null },
      { code: '440304', name: '福田区', level: 3, parentCode: '440300', parentId: null },
      
      // 江苏省
      { code: '320000', name: '江苏省', level: 1, parentCode: null, parentId: null },
      { code: '320100', name: '南京市', level: 2, parentCode: '320000', parentId: null },
      { code: '320102', name: '玄武区', level: 3, parentCode: '320100', parentId: null },
      { code: '320104', name: '秦淮区', level: 3, parentCode: '320100', parentId: null },
      
      // 浙江省
      { code: '330000', name: '浙江省', level: 1, parentCode: null, parentId: null },
      { code: '330100', name: '杭州市', level: 2, parentCode: '330000', parentId: null },
      { code: '330102', name: '上城区', level: 3, parentCode: '330100', parentId: null },
      { code: '330105', name: '拱墅区', level: 3, parentCode: '330100', parentId: null }
    ];

    this.regions = fallbackData;
    await this.generateSQLFile();
  }

  async generateSQLFile() {
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    let sqlContent = `-- 行政区划数据插入脚本
-- 生成时间: ${timestamp}
-- 数据来源: 民政部行政区划代码

INSERT INTO \`regions\` (\`tenantId\`, \`code\`, \`name\`, \`level\`, \`parentCode\`, \`parentId\`, \`createdAt\`, \`updatedAt\`) VALUES\n`;

    const values = this.regions.map(region => {
      return `(${this.tenantId}, '${region.code}', '${region.name.replace(/'/g, "\\'")}', ${region.level}, ${region.parentCode ? `'${region.parentCode}'` : 'NULL'}, ${region.parentId || 'NULL'}, '${timestamp}', '${timestamp}')`;
    });

    sqlContent += values.join(',\n') + ';';

    // 保存到文件
    const outputPath = path.join(__dirname, '../db/migrations/regions-data.sql');
    fs.writeFileSync(outputPath, sqlContent, 'utf8');
    
    console.log(`SQL文件已生成: ${outputPath}`);
    console.log(`包含 ${this.regions.length} 条记录`);

    // 同时生成JSON格式的数据
    const jsonPath = path.join(__dirname, '../db/migrations/regions-data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.regions, null, 2), 'utf8');
    console.log(`JSON文件已生成: ${jsonPath}`);
  }
}

// 执行脚本
async function main() {
  const scraper = new RegionScraper();
  await scraper.scrapeRegions();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = RegionScraper;