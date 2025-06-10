export async function beforeCreate(data, req) {
  const currentUser = req?.user?.username || 'system'; 
  data.created = currentUser;
  data.updated = currentUser;
  data.createdAt = new Date();
  // sequelize的create方法会自动处理createdAt和updatedAt, 这里无需手动设置
  return data;
}

export async function beforeUpdate(id, data, req) {
  const currentUser = req?.user?.username || 'system';
  data.updated = currentUser;
  data.updatedAt = new Date();
  // sequelize的update方法会自动处理updatedAt, 这里无需手动设置
  return data;
} 