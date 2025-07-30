export async function beforeCreate(data) {
  console.log("beforeCreate hook for demo table", data);
  data.ui = {
    mask: "1111111111",
    width: 200,
    component: "Input",
  };
}

export async function afterCreate(instance) {
  console.log("afterCreate hook for demo table", instance);
}

export async function beforeUpdate(id, data) {
  console.log("beforeUpdate hook for demo table", id, data);
  data.updatedAt = new Date();
  return data;
}

export async function afterUpdate(id, data) {
  console.log("afterUpdate hook for demo table", id, data);
}

export async function beforeDelete(id) {
  console.log("beforeDelete hook for demo table", id);
}

export async function afterDelete(id) {
  console.log("afterDelete hook for demo table", id);
}
