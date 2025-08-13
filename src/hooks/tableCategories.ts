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



  let tables = await DynamicTable.findAll();

  return {
    categories,
    tables
  }
}
