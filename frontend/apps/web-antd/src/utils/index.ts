// 对应 sequelize DataTypes 的所有类型
export const ColumnDataTypes = {
  ID: "INTEGER",
  DOCNO: "STRING",
  DATENUMBER: "INTEGER",
  DATE: 'DATE',
  QTY: 'INTEGER',
  AMT: 'DECIMAL',
  STRING: 'STRING',
  TEXT: 'TEXT',
  JSON: 'JSON',
  INTEGER: 'INTEGER',
  BOOLEAN: 'BOOLEAN',
  FLOAT: 'FLOAT',
  DOUBLE: 'DOUBLE',
  DECIMAL: 'DECIMAL',
  BIGINT: 'BIGINT',
};

export function debounce<T extends (...args: any[]) => Promise<any>>(func: T, delay: number): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout | null = null;
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    if (timeoutId) clearTimeout(timeoutId);
    return new Promise((resolve) => {
      timeoutId = setTimeout(async () => resolve(await func(...args)), delay);
    });
  };
}

// export {
//   debounce,
//   ColumnDataTypes,
// }
