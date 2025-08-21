const assert = require('assert');
require('ts-node/register');
require('tsconfig-paths/register');
const { Op } = require('sequelize');

const DataScopeService = require('../src/services/DataScopeService.ts').default;
const CacheService = require('../src/services/CacheService.ts').default;
const User = require('../src/db/models/User.ts').default;

describe('DataScopeService.getDataScopeWhere', function () {
  const orig = {
    getDataScope: CacheService.getDataScope,
    setDataScope: CacheService.setDataScope,
    getTableByAliasName: CacheService.getTableByAliasName,
    findByPk: User.findByPk,
  };

  afterEach(function () {
    // 恢复打桩
    CacheService.getDataScope = orig.getDataScope;
    CacheService.setDataScope = orig.setDataScope;
    CacheService.getTableByAliasName = orig.getTableByAliasName;
    User.findByPk = orig.findByPk;
  });

  it('should return processed cached where with runtime variables replaced', async function () {
    CacheService.getDataScope = (userId, resource) => {
      return { ownerId: '${currentUserId}' };
    };
    // 避免落盘缓存产生副作用
    CacheService.setDataScope = () => {};

    const where = await DataScopeService.getDataScopeWhere(99, 'any');
    assert.strictEqual(where.ownerId, 99);
  });

  it('should merge normal rules and exist conditions when cache missed', async function () {
    // 缓存未命中
    CacheService.getDataScope = () => null;
    let saved = null;
    CacheService.setDataScope = (userId, resource, val) => { saved = val; };
    // 不提供表别名定义，走回退分支使用 resource 作为表名
    CacheService.getTableByAliasName = () => null;

    // 打桩 User 和其角色/数据范围
    User.findByPk = async (id) => ({
      id,
      tenantId: 3,
      getRoles: async () => [
        {
          DataScopes: [
            // ruleBuilder -> 普通条件，使用 ${currentUserId} 占位符
            {
              ruleBuilder: {
                logic: 'AND',
                conditions: [
                  { field: 'createdBy', operator: 'equals', value: '${currentUserId}' },
                ],
              },
            },
            // 结构化 exist 条件（非 ruleBuilder），走 applyExistConditions 分支
            {
              rule: {
                exist: {
                  model: 'child',
                  as: 'c',
                  from: 'user_id',
                  to: 'id',
                  whereSql: 'c.active=1',
                },
              },
            },
          ],
        },
      ],
    });

    const where = await DataScopeService.getDataScopeWhere(10, 'main');
    // 应已写入缓存
    assert.ok(saved, 'should save whereClause into cache');

    // 期望 AND 合并：[ 原有 OR(normalConditions), OR(EXISTS...) ]
    assert.ok(where[Op.and], 'should wrap by Op.and when exist conditions present');
    assert.ok(Array.isArray(where[Op.and]) && where[Op.and].length === 2, 'Op.and should include 2 parts');

    // 第一个部分：普通条件 OR
    const part1 = where[Op.and][0];
    assert.ok(part1[Op.or], 'first part should be Op.or normal conditions');
    const orList = part1[Op.or];
    assert.ok(Array.isArray(orList) && orList.length === 1, 'normal conditions should contain one item');
    assert.deepStrictEqual(orList[0], { createdBy: { [Op.eq]: 10 } }, 'variable should be replaced with currentUserId');

    // 第二个部分：EXISTS OR
    const part2 = where[Op.and][1];
    assert.ok(part2[Op.or], 'second part should be Op.or exists literals');
    const exList = part2[Op.or];
    assert.ok(Array.isArray(exList) && exList.length === 1, 'exists list should contain one literal');
    const lit = exList[0];
    // Sequelize literal 一般包含 .val 属性，包含生成的 SQL
    assert.ok(lit && typeof lit === 'object', 'exists should be a literal object');
    const sql = lit.val || String(lit);
    assert.ok(String(sql).includes('SELECT 1'), 'exists literal should contain subquery');
    assert.ok(String(sql).includes('EXISTS'), 'should be EXISTS subquery');
  });
});