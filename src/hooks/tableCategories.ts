import { DynamicTable, TableCategory } from "@/db/models";

export async function beforeCreate(data) {
  console.log('beforeCreate hook for demo table', data);
  // a simple data validation
  if (!data.name) {
    throw new Error('Name is required');
  }
  data.createdAt = new Date();
  return data;
}

export async function afterCreate(instance) {
  console.log('afterCreate hook for demo table', instance);
}

export async function beforeUpdate(id, data) {
  console.log('beforeUpdate hook for demo table', id, data);
  data.updatedAt = new Date();
  return data;
}

export async function afterUpdate(id, data) {
  console.log('afterUpdate hook for demo table', id, data);
}

export async function beforeDelete(id) {
  console.log('beforeDelete hook for demo table', id);
}

export async function afterDelete(id) {
  console.log('afterDelete hook for demo table', id);
} 

export async function getMenus() {
  let categories = await TableCategory.findAll();
  // categories 转成树形结构
  let list = categories.map(cat => cat.toJSON());
  // TODO 自动按照表的分类ID来插入分类。 同时校验权限，如果没有权限就不展示菜单。
  let tables = await DynamicTable.findAll({
    where: {
      isActive: true,
    }
  });
  let mixins = tables.map(table => table.toJSON()).map(table=>{
    return {
      id: -table.id,
      parentId: table.categoryId || null,
      type: 'menu',
      name: table.description,
      path: `/crud/${table.alias_name}`,
      meta: {}
    }
  })

  let tree = listToTree([...list, ...mixins], 'parentId');


  return tree
}

function listToTree(list, parentIdField = 'parentId') {
    // 创建节点ID到节点的映射表，方便快速查找
    const nodeMap = new Map();
    // 存储最终的树形结构
    const tree = [];
    
    // 第一步：构建节点映射表，并初始化每个节点的children数组
    for (const item of list) {
        // 为每个节点添加children属性（如果不存在）
        nodeMap.set(item.id, { ...item, children: [] });
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
            const parentNode = nodeMap.get(parentId);
            if (parentNode) {
                parentNode.children.push(currentNode);
            }
        }
    }
    
    return tree;
}
