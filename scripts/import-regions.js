const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 从民政部网站获取行政区划数据的解析脚本
// 数据来源：https://www.mca.gov.cn/mzsj/xzqh/2023/202301xzqh.html

const REGION_DATA_URL = 'https://www.mca.gov.cn/mzsj/xzqh/2023/202301xzqh.html';

// 解析行政区划代码和名称
function parseRegionData(htmlContent) {
  const regions = [];
  
  // 这里需要根据实际的HTML结构来解析
  // 由于网站结构可能变化，这里提供一个基础的解析框架
  const lines = htmlContent.split('\n');
  
  for (const line of lines) {
    // 匹配行政区划代码和名称的正则表达式
    const match = line.match(/(\d{6})\s+(.+)/);
    if (match) {
      const [, code, name] = match;
      const cleanName = name.trim().replace(/\s+/g, '');
      
      // 判断级别
      let level = 1; // 省级
      if (code.endsWith('0000')) {
        level = 1; // 省级
      } else if (code.endsWith('00')) {
        level = 2; // 市级
      } else {
        level = 3; // 区县级
      }
      
      // 确定父级代码
      let parentCode = null;
      if (level === 2) {
        parentCode = code.substring(0, 2) + '0000';
      } else if (level === 3) {
        parentCode = code.substring(0, 4) + '00';
      }
      
      regions.push({
        code,
        name: cleanName,
        level,
        parentCode
      });
    }
  }
  
  return regions;
}

// 预定义的行政区划数据（2023年版本的部分数据）
const PREDEFINED_REGIONS = [
  // 省级
  { code: '110000', name: '北京市', level: 1, parentCode: null },
  { code: '120000', name: '天津市', level: 1, parentCode: null },
  { code: '130000', name: '河北省', level: 1, parentCode: null },
  { code: '140000', name: '山西省', level: 1, parentCode: null },
  { code: '150000', name: '内蒙古自治区', level: 1, parentCode: null },
  { code: '210000', name: '辽宁省', level: 1, parentCode: null },
  { code: '220000', name: '吉林省', level: 1, parentCode: null },
  { code: '230000', name: '黑龙江省', level: 1, parentCode: null },
  { code: '310000', name: '上海市', level: 1, parentCode: null },
  { code: '320000', name: '江苏省', level: 1, parentCode: null },
  { code: '330000', name: '浙江省', level: 1, parentCode: null },
  { code: '340000', name: '安徽省', level: 1, parentCode: null },
  { code: '350000', name: '福建省', level: 1, parentCode: null },
  { code: '360000', name: '江西省', level: 1, parentCode: null },
  { code: '370000', name: '山东省', level: 1, parentCode: null },
  { code: '410000', name: '河南省', level: 1, parentCode: null },
  { code: '420000', name: '湖北省', level: 1, parentCode: null },
  { code: '430000', name: '湖南省', level: 1, parentCode: null },
  { code: '440000', name: '广东省', level: 1, parentCode: null },
  { code: '450000', name: '广西壮族自治区', level: 1, parentCode: null },
  { code: '460000', name: '海南省', level: 1, parentCode: null },
  { code: '500000', name: '重庆市', level: 1, parentCode: null },
  { code: '510000', name: '四川省', level: 1, parentCode: null },
  { code: '520000', name: '贵州省', level: 1, parentCode: null },
  { code: '530000', name: '云南省', level: 1, parentCode: null },
  { code: '540000', name: '西藏自治区', level: 1, parentCode: null },
  { code: '610000', name: '陕西省', level: 1, parentCode: null },
  { code: '620000', name: '甘肃省', level: 1, parentCode: null },
  { code: '630000', name: '青海省', level: 1, parentCode: null },
  { code: '640000', name: '宁夏回族自治区', level: 1, parentCode: null },
  { code: '650000', name: '新疆维吾尔自治区', level: 1, parentCode: null },
  
  // 市级（部分示例）
  { code: '110100', name: '北京市', level: 2, parentCode: '110000' },
  { code: '120100', name: '天津市', level: 2, parentCode: '120000' },
  { code: '130100', name: '石家庄市', level: 2, parentCode: '130000' },
  { code: '130200', name: '唐山市', level: 2, parentCode: '130000' },
  { code: '130300', name: '秦皇岛市', level: 2, parentCode: '130000' },
  { code: '310100', name: '上海市', level: 2, parentCode: '310000' },
  { code: '320100', name: '南京市', level: 2, parentCode: '320000' },
  { code: '320200', name: '无锡市', level: 2, parentCode: '320000' },
  { code: '320300', name: '徐州市', level: 2, parentCode: '320000' },
  { code: '330100', name: '杭州市', level: 2, parentCode: '330000' },
  { code: '330200', name: '宁波市', level: 2, parentCode: '330000' },
  { code: '440100', name: '广州市', level: 2, parentCode: '440000' },
  { code: '440300', name: '深圳市', level: 2, parentCode: '440000' },
  
  // 区县级（部分示例）
  { code: '110101', name: '东城区', level: 3, parentCode: '110100' },
  { code: '110102', name: '西城区', level: 3, parentCode: '110100' },
  { code: '110105', name: '朝阳区', level: 3, parentCode: '110100' },
  { code: '110106', name: '丰台区', level: 3, parentCode: '110100' },
  { code: '310101', name: '黄浦区', level: 3, parentCode: '310100' },
  { code: '310104', name: '徐汇区', level: 3, parentCode: '310100' },
  { code: '310105', name: '长宁区', level: 3, parentCode: '310100' },
  { code: '320102', name: '玄武区', level: 3, parentCode: '320100' },
  { code: '320104', name: '秦淮区', level: 3, parentCode: '320100' },
  { code: '330102', name: '上城区', level: 3, parentCode: '330100' },
  { code: '330103', name: '下城区', level: 3, parentCode: '330100' },
  { code: '440103', name: '荔湾区', level: 3, parentCode: '440100' },
  { code: '440104', name: '越秀区', level: 3, parentCode: '440100' },
  { code: '440303', name: '罗湖区', level: 3, parentCode: '440300' },
  { code: '440304', name: '福田区', level: 3, parentCode: '440300' },
];

// 保存数据到文件
function saveRegionData(regions) {
  const outputPath = path.join(__dirname, '../db/region-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(regions, null, 2), 'utf8');
  console.log(`Region data saved to ${outputPath}`);
  console.log(`Total regions: ${regions.length}`);
}

// 主函数
async function main() {
  try {
    console.log('Starting region data import...');
    
    // 使用预定义数据
    console.log('Using predefined region data...');
    const regions = PREDEFINED_REGIONS;
    
    // 可选：尝试从网站获取最新数据
    // try {
    //   console.log('Fetching data from MCA website...');
    //   const response = await axios.get(REGION_DATA_URL, {
    //     timeout: 10000,
    //     headers: {
    //       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    //     }
    //   });
    //   
    //   const parsedRegions = parseRegionData(response.data);
    //   if (parsedRegions.length > 0) {
    //     regions = parsedRegions;
    //     console.log('Successfully fetched data from website');
    //   }
    // } catch (error) {
    //   console.log('Failed to fetch from website, using predefined data');
    // }
    
    // 保存数据
    saveRegionData(regions);
    
    console.log('Region data import completed successfully!');
    console.log('You can now use this data to populate your database.');
    
  } catch (error) {
    console.error('Error importing region data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { PREDEFINED_REGIONS, parseRegionData, saveRegionData };