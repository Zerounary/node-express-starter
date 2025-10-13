/**
 * Converts a flat JSON object into an XML string, wrapping it in <xml> tags.
 *
 * Example input:
 * {
 *   "appid": "wx2421b1c4370ec43b",
 *   "mch_id": "10000100"
 * }
 *
 * Example output:
 * <xml><appid>wx2421b1c4370ec43b</appid><mch_id>10000100</mch_id></xml>
 *
 * @param json The flat JSON object to convert.
 * @returns The corresponding XML string.
 */
export function jsonToXml(json: any): string {
  if (!json || typeof json !== 'object') {
    return '';
  }

  let xmlStr = '<xml>';
  for (const key in json) {
    if (Object.prototype.hasOwnProperty.call(json, key)) {
      xmlStr += `<${key}>${json[key]}</${key}>`;
    }
  }
  xmlStr += '</xml>';

  return xmlStr;
}
