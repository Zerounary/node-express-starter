import { DynamicTable, TableCategory } from "@/db/models";
import CacheService from "@/services/CacheService";
import PermissionService from "@/services/PermissionService";
import { listToTree } from "@/utils";
import { Op } from "sequelize";

export async function beforeCreate(data) {
  console.log("beforeCreate hook for demo table", data);
  // a simple data validation
  if (!data.name) {
    throw new Error("Name is required");
  }
  data.createdAt = new Date();
  return data;
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

export async function exportTableConfig({ ids, id: categoryId, user, res }) {
  let tables = [];
  let categories = [];
  const merge = async (categoryId) => {
    categories = [
      ...categories,
      ...(await TableCategory.findAll({
        where: {
          id: {
            [Op.in]: [categoryId],
          },
        },
      })).map(e => e.toJSON()),
    ];
    let tablesInCategory = await DynamicTable.findAll({
      attributes: ["id"],
      where: {
        categoryId,
      },
    });
    if (tablesInCategory?.length) {
      for (let table of tablesInCategory) {
        let tableId = table.id;
        tables.push(await CacheService.getTableById(tableId));
      }
    }
  };
  if (categoryId) {
    await merge(categoryId);
  } else {
    if (ids.length === 0) {
      throw new Error("请至少选择一个类别");
    }
    for (let id of ids) {
      await merge(id);
    }
  }
  return {
    msg: "导出成功",
    action: "download",
    data: {
      tables,
      categories: listToTree(categories),
    },
  };
}

export async function getMenus({ user }) {
  const { id: userId, tenantId } = user;

  let permissions = [
    ...(await PermissionService.getAllUserPermissions(userId)),
  ];

  const permittedTables = permissions
    .filter((e) => e.endsWith(":view") || e.endsWith(":*"))
    .map((e) => {
      // data:dashboard:view => dashboard
      let parts = e.split(":");
      return parts[1];
    });

  let permLimits = {};
  let categoryPermLimits = {};
  if (permittedTables.length === 0) {
    return [];
  } else {
    let all = permittedTables.find((e) => e == "*");
    if (!all) {
      permLimits = {
        alias_name: {
          [Op.in]: permittedTables.filter((e) => e != "*"),
        },
      };
      categoryPermLimits = {
        path: {
          [Op.in]: permittedTables.filter((e) => e != "*").map((e) => "/" + e),
        },
      };
    }
  }

  // 只有超级管理员才能查看和编辑开发平台
  if (tenantId != 1) {
    categoryPermLimits = {
      name: {
        [Op.ne]: "开发平台",
      },
      ...categoryPermLimits,
    };
  }

  let categories = await TableCategory.findAll({
    where: {
      ...categoryPermLimits,
    },
    order: [
      ["orderno", "ASC"],
      ["ID", "ASC"],
    ],
  });
  // categories 转成树形结构
  let list = categories
    .map((cat) => cat.toJSON())
    .map((e) => {
      return {
        ...e,
        table: e.path.replace("/", ""),
      };
    });

  let tables = await DynamicTable.findAll({
    where: {
      isActive: {
        [Op.eq]: true,
      },
      hideMenu: false,
      ...permLimits,
    },
    order: [
      ["orderno", "ASC"],
      ["ID", "ASC"],
    ],
  });
  let mixins = tables
    .map((table) => table.toJSON())
    .map((table) => {
      return {
        id: -table.id,
        parentId: table.categoryId || null,
        type: "menu",
        name: table.description,
        path: `/crud/${table.alias_name}`,
        table: table.alias_name,
        meta: {},
      };
    });

  let tree = listToTree([...list, ...mixins], "parentId");

  return tree;
}
