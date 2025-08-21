import { Op } from 'sequelize';

type Escaper = (v: any) => string;

function arrayToList(val: any, esc: Escaper): string {
  const list = Array.isArray(val) ? val : [val];
  return `(${list.map(esc).join(', ')})`;
}

/**
 * 将 Sequelize 风格的 where 对象转换为 SQL 片段（带表别名）
 * 仅用于 exists 子查询的 where 构建
 */
export function whereObjectToSql(cond: any, alias: string, esc: Escaper): string {
  if (!cond || typeof cond !== 'object') return '';

  // 逻辑运算符优先
  const symbols = Object.getOwnPropertySymbols(cond);
  const andKey = symbols.find((s) => s === Op.and);
  const orKey = symbols.find((s) => s === Op.or);
  if (andKey) {
    const arr = cond[andKey] as any[];
    const sub = arr.map((c) => whereObjectToSql(c, alias, esc)).filter(Boolean);
    return sub.length ? `(${sub.join(' AND ')})` : '';
  }
  if (orKey) {
    const arr = cond[orKey] as any[];
    const sub = arr.map((c) => whereObjectToSql(c, alias, esc)).filter(Boolean);
    return sub.length ? `(${sub.join(' OR ')})` : '';
  }

  const parts: string[] = [];
  for (const field of Object.keys(cond)) {
    const cmp = (cond as any)[field];
    if (cmp && typeof cmp === 'object') {
      const cmpSymbols = Object.getOwnPropertySymbols(cmp);
      if (cmpSymbols.length === 0) {
        const nested = whereObjectToSql(cmp, alias, esc);
        if (nested) parts.push(nested);
        continue;
      }
      for (const op of cmpSymbols) {
        const val = (cmp as any)[op];
        if (op === Op.eq) parts.push(`${alias}.\`${field}\` = ${esc(val)}`);
        else if (op === Op.ne) parts.push(`${alias}.\`${field}\` != ${esc(val)}`);
        else if (op === Op.gt) parts.push(`${alias}.\`${field}\` > ${esc(val)}`);
        else if (op === Op.gte) parts.push(`${alias}.\`${field}\` >= ${esc(val)}`);
        else if (op === Op.lt) parts.push(`${alias}.\`${field}\` < ${esc(val)}`);
        else if (op === Op.lte) parts.push(`${alias}.\`${field}\` <= ${esc(val)}`);
        else if (op === Op.like) parts.push(`${alias}.\`${field}\` LIKE ${esc(val)}`);
        else if (op === Op.startsWith) parts.push(`${alias}.\`${field}\` LIKE ${esc(String(val) + '%')}`);
        else if (op === Op.endsWith) parts.push(`${alias}.\`${field}\` LIKE ${esc('%' + String(val))}`);
        else if (op === Op.in) parts.push(`${alias}.\`${field}\` IN ${arrayToList(val, esc)}`);
        else if (op === Op.notIn) parts.push(`${alias}.\`${field}\` NOT IN ${arrayToList(val, esc)}`);
      }
    } else {
      parts.push(`${alias}.\`${field}\` = ${esc(cmp)}`);
    }
  }

  if (parts.length > 1) return `(${parts.join(' AND ')})`;
  return parts[0] || '';
}