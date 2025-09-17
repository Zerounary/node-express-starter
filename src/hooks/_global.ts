export async function beforeCreate(data, req) {
  const currentUser = req?.user?.id || 1; 
  data.createdBy = currentUser;
  data.updatedBy = currentUser;
  data.createdAt = new Date();
  data.updatedAt = new Date();
  data.isActive = true;
  // sequelize的create方法会自动处理createdAt和updatedAt, 这里无需手动设置
  return data;
}

export async function beforeUpdate(id, data, req) {
  const currentUser = req?.user?.id || 1; 
  data.updatedBy = currentUser;
  data.updatedAt = new Date();
  // sequelize的update方法会自动处理updatedAt, 这里无需手动设置
  return data;
} 