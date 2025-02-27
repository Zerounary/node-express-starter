export function get_app_name(url = "") {
  return url
    .split("/")
    .pop()
    .replace(/\.[^.]+$/, "") // 移除文件扩展名
    .replace(/[^\w-]/g, "_"); // 特殊字符替换
}
