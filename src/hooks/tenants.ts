import { initTenantUser } from "@/db/init";
import { Role } from "@/db/models/Role";

export async function beforeCreate(data) {
  console.log('beforeCreate hook for demo table', data);
  // a simple data validation
  if (!data.name) {
    throw new Error('Name is required');
  }
  data.createdAt = new Date();
  return data;
}

export async function afterCreate(data) {
    // 创建角色
  await initTenantUser({
    name: data.name,
    password: "123456",
    tenant: data.name,
    permissions: ["data:*:*", "action:*:*"],
    roles: ["admin"],
  })
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