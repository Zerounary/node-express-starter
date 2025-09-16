import { ColumnDataTypes } from '@/../../shared/ColumnDataTypes';
function get_app_name(url = "") {
  return url
    .split("/")
    .pop()
    .replace(/\.[^.]+$/, "") // 移除文件扩展名
    .replace(/[^\w-]/g, "_"); // 特殊字符替换
}

function listToTree(list, parentIdField = "parentId") {
  // 创建节点ID到节点的映射表，方便快速查找
  const nodeMap = new Map();
  // 存储最终的树形结构
  const tree = [];

  // 第一步：构建节点映射表，并初始化每个节点的children数组
  for (const item of list) {
    // 为每个节点添加children属性（如果不存在）
    nodeMap.set(item.id, { ...item });
  }

  // 第二步：遍历所有节点，将子节点挂载到对应的父节点下
  for (const item of list) {
    const currentNode = nodeMap.get(item.id);
    const parentId = item[parentIdField];

    if (parentId === 0 || parentId === null || parentId === undefined) {
      // 如果是顶级节点（父ID为0、null或undefined），直接加入树形结构
      tree.push(currentNode);
    } else {
      // 找到父节点，并将当前节点添加到父节点的children中
      let parentNode = nodeMap.get(parentId);
      if (parentNode) {
        if (!parentNode.children) {
          parentNode.children = [];
        }
        parentNode.children.push(currentNode);
      }
    }
  }

  return tree;
}

class AppError extends Error {
  code: number;
  data: any;
  constructor(message, code = 500, data = null) {
    super(message)
    this.code = code
    this.data = data
  }
}

const isCreatable = (mask: string) => {
  return mask?.charAt(1) == '1'
}
const isUpdatable = (mask: string) => {
  return mask?.charAt(3) == '1'
}
export {
  get_app_name,
  ColumnDataTypes,
  listToTree,
  isCreatable,
  isUpdatable,
  AppError,
}