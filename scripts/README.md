# 行政区划数据抓取工具

## 功能说明

这个工具用于从民政部官网抓取中国行政区划数据，并生成可直接导入数据库的SQL文件。

## 文件说明

- `scrape-regions-simple.js` - 主要的抓取脚本
- `run-scraper.js` - 执行脚本的入口文件
- `scrape-regions.js` - 完整版抓取脚本（备用）

## 使用方法

### 1. 安装依赖

确保已安装必要的npm包：

```bash
npm install axios cheerio
```

### 2. 执行抓取

```bash
# 方法1: 直接运行
cd scripts
node run-scraper.js

# 方法2: 从项目根目录运行
node scripts/run-scraper.js
```

### 3. 查看结果

脚本执行后会在 `db/migrations/` 目录下生成两个文件：

- `regions-data.sql` - SQL插入语句文件
- `regions-data.json` - JSON格式的原始数据

## 数据结构

生成的数据包含以下字段：

- `tenantId` - 租户ID（默认为1）
- `code` - 行政区划代码（6位数字）
- `name` - 区域名称
- `level` - 行政级别（1=省级，2=市级，3=区县级）
- `parentCode` - 父级区域代码
- `parentId` - 父级区域ID（默认为NULL）
- `createdAt` - 创建时间
- `updatedAt` - 更新时间

## 数据来源

- 主要数据源：[民政部行政区划代码](https://www.mca.gov.cn/mzsj/xzqh/2023/202301xzqh.html)
- 备用数据：脚本内置的主要省市区数据

## 注意事项

1. **网络访问**：脚本需要访问民政部官网，如果网络不通会自动使用备用数据
2. **数据更新**：民政部数据可能会更新，建议定期重新抓取
3. **数据完整性**：备用数据只包含主要的省市区，完整数据需要成功抓取官网
4. **编码问题**：确保数据库和文件编码为UTF-8

## 导入数据库

### MySQL示例

```sql
-- 1. 先创建表（如果还没有）
SOURCE db/migrations/create-regions-table.sql;

-- 2. 导入数据
SOURCE db/migrations/regions-data.sql;
```

### 验证数据

```sql
-- 查看总记录数
SELECT COUNT(*) FROM regions;

-- 查看各级别数量
SELECT level, COUNT(*) as count FROM regions GROUP BY level;

-- 查看省级数据
SELECT * FROM regions WHERE level = 1 ORDER BY code;
```

## 故障排除

### 1. 网络连接问题

如果抓取失败，脚本会自动使用备用数据。可以检查：
- 网络连接是否正常
- 是否能访问民政部网站
- 防火墙设置

### 2. 依赖包问题

```bash
# 重新安装依赖
npm install axios cheerio --save
```

### 3. 文件权限问题

确保脚本有写入 `db/migrations/` 目录的权限。

## 自定义配置

可以修改 `scrape-regions-simple.js` 中的以下参数：

```javascript
const tenantId = 1; // 修改默认租户ID
```

## 扩展功能

如需要更多功能，可以：

1. 修改抓取逻辑以获取更详细的数据
2. 添加数据验证和清洗功能
3. 支持增量更新
4. 添加其他数据源