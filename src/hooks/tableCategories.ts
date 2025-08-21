import { getUserPerms } from "@/db/dao/auth";
import { DynamicTable, TableCategory } from "@/db/models";
import User from "@/db/models/User";
import { Op } from "sequelize";

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

export async function getMenus({ user }) {

  const { id: userId, tenantId } = user;
  
  let permissions = await getUserPerms(userId)

  const permittedTables = permissions
    .filter(e => e.endsWith(':view') || e.endsWith(':*'))
    .map(e => {
      // data:dashboard:view => dashboard
      let parts = e.split(":");
      return parts[1];
    })

  let permLimits = {}
  let categoryPermLimits = {}
  if (permittedTables.length === 0) {
    return [];
  } else {
    let all = permittedTables.find(e => e == "*")
    if(!all) {
      permLimits = {
        name: {
          [Op.in]: permittedTables.filter(e => e != "*"),
        }
      }
      categoryPermLimits = {
        path: {
          [Op.in]: permittedTables.filter(e => e != "*").map(e => ('/' + e )),
        }
      }
    }
  }

  let where = {}

  // 只有超级管理员才能查看和编辑开发平台
  if(tenantId != 1) {
    where = {
      name: {
        [Op.ne]: '开发平台'
      },
      ...categoryPermLimits,
    }
  }

  let categories = await TableCategory.findAll({
    where,
    order: [['orderno', 'ASC'], ['ID', 'ASC']],
  });
  // categories 转成树形结构
  let list = categories.map(cat => cat.toJSON()).map(e => {
    return {
      ...e,
      table: e.path.replace('/', '')
    }
  });

  let tables = await DynamicTable.findAll({
    where: {
      isActive: {
        [Op.eq]: true
      },
      ...permLimits
    },
    order: [['orderno', 'ASC'], ['ID', 'ASC']],
  });
  let mixins = tables.map(table => table.toJSON()).map(table=>{
    return {
      id: -table.id,
      parentId: table.categoryId || null,
      type: 'menu',
      name: table.description,
      path: `/crud/${table.alias_name}`,
      table: table.alias_name,
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
                if(!parentNode.children) {
                  parentNode.children = []
                }
                parentNode.children.push(currentNode);
            }
        }
    }
    
    return tree;
}
