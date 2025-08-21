const assert = require('assert');
require('ts-node/register');
require('tsconfig-paths/register');
const { Op } = require('sequelize');

// 直接加载 TS 源码
const { processRules } = require('../src/services/utils/rule-processor.ts');
const { whereObjectToSql } = require('../src/services/utils/sql-where-builder.ts');
const { operatorMap, normalizeValueForOperator } = require('../src/services/utils/sequelize-operators.ts');

describe('utils/rule-processor', function () {
  it('processRules should replace ${var} recursively and keep non-plain objects intact', function () {
    class NonPlain { constructor(v) { this.v = v; } }
    const nonPlain = new NonPlain('${currentUserId}');

    const rules = {
      a: '${currentUserId}',
      b: [ '${currentUserId}', { c: '${currentUserId}' } ],
      d: nonPlain,
    };
    const out = processRules(rules, { currentUserId: 42 });

    assert.strictEqual(out.a, 42);
    assert.strictEqual(out.b[0], 42);
    assert.strictEqual(out.b[1].c, 42);
    // 非纯对象保持不变
    assert.strictEqual(out.d, nonPlain);
    assert.strictEqual(out.d.v, '${currentUserId}');
  });
});

describe('utils/sql-where-builder', function () {
  const esc = (v) => {
    if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
    if (v === null) return 'NULL';
    return String(v);
  };

  it('whereObjectToSql should generate SQL with alias and operators', function () {
    const cond = {
      name: { [Op.like]: '%abc%' },
      age: { [Op.gte]: 18, [Op.lt]: 60 },
      status: { [Op.in]: ['A', 'B'] },
      city: { [Op.startsWith]: 'Sh' },
      code: { [Op.endsWith]: '99' },
    };
    const root = { [Op.and]: [cond, { id: { [Op.ne]: 0 } }] };

    const sql = whereObjectToSql(root, 't1', esc);

    // 只做包含判断，避免顺序差异导致测试脆弱
    assert.ok(sql.includes("t1.`name` LIKE '%abc%'"));
    assert.ok(sql.includes("t1.`age` >="));
    assert.ok(sql.includes("t1.`age` <"));
    assert.ok(sql.includes("t1.`status` IN ('A', 'B')"));
    assert.ok(sql.includes("t1.`city` LIKE 'Sh%'"));
    assert.ok(sql.includes("t1.`code` LIKE '%99'"));
    assert.ok(sql.includes("t1.`id` !="));
  });
});

describe('utils/sequelize-operators', function () {
  it('operatorMap should map string to Sequelize Op', function () {
    assert.strictEqual(operatorMap.equals, Op.eq);
    assert.strictEqual(operatorMap.not, Op.ne);
    assert.strictEqual(operatorMap.gt, Op.gt);
    assert.strictEqual(operatorMap.gte, Op.gte);
    assert.strictEqual(operatorMap.lt, Op.lt);
    assert.strictEqual(operatorMap.lte, Op.lte);
    assert.strictEqual(operatorMap.in, Op.in);
    assert.strictEqual(operatorMap.notIn, Op.notIn);
    assert.strictEqual(operatorMap.contains, Op.like);
    assert.strictEqual(operatorMap.startsWith, Op.startsWith);
    assert.strictEqual(operatorMap.endsWith, Op.endsWith);
  });

  it('normalizeValueForOperator should only wrap value for contains', function () {
    assert.strictEqual(normalizeValueForOperator('contains', 'x'), '%x%');
    assert.strictEqual(normalizeValueForOperator('startsWith', 'x'), 'x');
    assert.strictEqual(normalizeValueForOperator('endsWith', 'x'), 'x');
    assert.strictEqual(normalizeValueForOperator('equals', 'x'), 'x');
  });
});