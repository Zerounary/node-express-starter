// 对应 sequelize DataTypes 的所有类型
// 实际的类型映射在 DynamicDataService.ts 中的 mapDataType 方法中维护
export const ColumnDataTypes = {
  ID: "ID",
  DOCNO: "DOCNO",
  DATENUMBER: "DATENUMBER",
  DATE: 'DATE',
  DATETIME: 'DATETIME',
  DATERANGE: 'DATERANGE',
  QTY: 'QTY',
  AMT: 'AMT',
  STRING: 'STRING',
  ENUM: 'ENUM',
  TEXT: 'TEXT',
  JSON: 'JSON',
  REGION: 'REGION',
  INTEGER: 'INTEGER',
  BOOLEAN: 'BOOLEAN',
  DECIMAL: 'DECIMAL',
  BIGINT: 'BIGINT',
  VIRTUAL: 'VIRTUAL',
};