import { DynamicColumn } from "@/db/models";
import { ColumnDataTypes } from "~/shared/ColumnDataTypes";

function isEmptyStr(v: unknown) {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

function parseBoolean(str: string): boolean | undefined {
  const s = str.trim().toLowerCase();
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return undefined;
}

function parseInteger(str: string): number | undefined {
  if (!/^[+-]?\d+$/.test(str.trim())) return undefined;
  const n = Number(str);
  if (!Number.isSafeInteger(n)) return undefined;
  return n;
}

function parseNumber(str: string): number | undefined {
  if (!/^[+-]?\d+(\.\d+)?$/.test(str.trim())) return undefined;
  const n = Number(str);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function parseBigInt(str: string): bigint | undefined {
  try {
    // 允许带空白
    const s = str.trim();
    if (!/^[+-]?\d+$/.test(s)) return undefined;
    return BigInt(s);
  } catch {
    return undefined;
  }
}

function parseDate(str: string): Date | undefined {
  const s = str.trim();
  // 数字字符串作为时间戳（毫秒/秒）
  if (/^[+-]?\d+$/.test(s)) {
    const num = Number(s);
    const ts = s.length <= 10 ? num * 1000 : num;
    const d = new Date(ts);
    return isNaN(d.getTime()) ? undefined : d;
  }
  // 通用 ISO/可被 Date 解析
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;

  // 简单 yyyy-MM-dd 或 yyyy/MM/dd
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const [_, y, mo, da, hh = "0", mm = "0", ss = "0"] = m;
    const dt = new Date(
      Number(y),
      Number(mo) - 1,
      Number(da),
      Number(hh),
      Number(mm),
      Number(ss)
    );
    return isNaN(dt.getTime()) ? undefined : dt;
  }
  return undefined;
}

function parseJSONValue(str: string): unknown | undefined {
  try {
    return JSON.parse(str);
  } catch {
    return undefined;
  }
}

/**
 * 数据类型回退默认值
 */
function fallbackDefault(column: DynamicColumn) {
  switch (column.dataType) {
    case ColumnDataTypes.ID:
      return null;
    case ColumnDataTypes.DOCNO:
      return null;
    case ColumnDataTypes.DATENUMBER:
      return null; // 或使用当天 yyyymmdd
    case ColumnDataTypes.DATE:
      if(column.defaultValue == 'now') {
        // "2025-09-24T08:50:06.000Z" 字符串
        return new Date().toISOString();
      }
      return null;
    case ColumnDataTypes.DATERANGE:
      return null;
    case ColumnDataTypes.QTY:
    case ColumnDataTypes.INTEGER:
      return 0;
    case ColumnDataTypes.AMT:
    case ColumnDataTypes.DECIMAL:
      return 0;
    case ColumnDataTypes.BIGINT:
      return 0n;
    case ColumnDataTypes.STRING:
    case ColumnDataTypes.TEXT:
      return null;
    case ColumnDataTypes.ENUM:
      return null;
    case ColumnDataTypes.JSON:
      return null;
    case ColumnDataTypes.REGION:
      return null;
    case ColumnDataTypes.BOOLEAN:
      return null;
    case ColumnDataTypes.VIRTUAL:
      return null;
    default:
      return null;
  }
}

/**
 * 主函数：优先解析列上的字符串 defaultValue；为空才回退到类型默认值
 */
export function getDefaultValue(column: DynamicColumn) {
  const raw = column.defaultValue;
  if (!isEmptyStr(raw)) {
    const val = raw as string;
    switch (column.dataType) {
      case ColumnDataTypes.STRING:
      case ColumnDataTypes.TEXT:
      case ColumnDataTypes.DOCNO:
        // 文本类直接返回，保留原样或按需 trim
        return val;

      case ColumnDataTypes.BOOLEAN: {
        const b = parseBoolean(val);
        if (b !== undefined) return b;
        break;
      }

      case ColumnDataTypes.INTEGER:
      case ColumnDataTypes.QTY:
      case ColumnDataTypes.DATENUMBER: {
        const n = parseInteger(val);
        if (n !== undefined) return n;
        break;
      }

      case ColumnDataTypes.AMT:
      case ColumnDataTypes.DECIMAL: {
        const n = parseNumber(val);
        if (n !== undefined) return n;
        break;
      }

      case ColumnDataTypes.BIGINT: {
        const n = parseBigInt(val);
        if (n !== undefined) return n;
        break;
      }

      case ColumnDataTypes.DATE: {
        const d = parseDate(val);
        if (d !== undefined) return d;
        break;
      }

      case ColumnDataTypes.JSON: {
        const parsed = parseJSONValue(val);
        if (parsed !== undefined) {
          // 可选类型校验：若期望数组而不是对象
          // 若类型不匹配，继续回退
          return parsed;
        }
        break;
      }
      case ColumnDataTypes.REGION: {
        const parsed = parseJSONValue(val);
        if (parsed !== undefined) {
          // 可选类型校验：若期望数组而不是对象
          // 若类型不匹配，继续回退
          return parsed;
        }
        break;
      }

      case ColumnDataTypes.ID:
      case ColumnDataTypes.VIRTUAL:
        // 通常不应设置默认值，若传了也不解析，回退
        break;

      default:
        // 未知类型不解析
        break;
    }
  }

  // 为空或解析失败，回退到类型默认值
  return fallbackDefault(column);
}
