import { Op } from 'sequelize';

/**
 * 统一的字符串操作符到 Sequelize Op 的映射
 * 便于在解析规则时统一转换
 */
export const operatorMap: Record<string, any> = {
  equals: Op.eq,
  not: Op.ne,
  gt: Op.gt,
  gte: Op.gte,
  lt: Op.lt,
  lte: Op.lte,
  in: Op.in,
  notIn: Op.notIn,
  contains: Op.like,
  startsWith: Op.startsWith,
  endsWith: Op.endsWith,
};

/**
 * 根据操作符规范化比较值
 * - contains: %value%
 * - startsWith: value%
 * - endsWith: %value
 *
 * 注意：为保持与现有行为一致（parseRule 仅对 contains 包裹通配符），
 * 如需在 parseRule 中使用，仅对 contains 进行处理。
 * 其他两个留给 SQL 生成器在 exists 子查询场景处理。
 */
export function normalizeValueForOperator(operator: string, value: any): any {
  if (operator === 'contains') return `%${value}%`;
  return value;
}
