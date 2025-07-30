import { DynamicColumn, DynamicTable } from "./models";
import { Permission, Role } from "./models/Role";
import Tenant from "./models/Tenant";
import User from "./models/User";

const getColumnFilterOp = (column) => {
  switch (column.dataType) {
    case "STRING":
    case "TEXT":
      return "like";
    case "INTEGER":
    case "FLOAT":
    case "DOUBLE":
      return "eq";
    case "DATE":
      return "eq";
    case "BOOLEAN":
      return "eq";
    default:
      return "eq";
  }
};

const autoFill = (column, index) => {
  return {
    ...column,
    orderno: column.orderno || (index + 1) * 10,
    ui: {
      mask: "1111111111",
      width: 100,
      component: "Input",
      filterOp: getColumnFilterOp(column),
      ...column.ui,
    },
  };
};

export const defaultColumns = (columns = []) => {
  return [
    {
      name: "id",
      dataType: "INTEGER",
      required: true,
      description: "ID",
      relationshipType: undefined,
      relatedToTableId: undefined,
      enumValues: undefined,
      ui: {
        mask: "0000000000",
        width: 100,
        component: "Input",
        disabled: true,
      },
      orderno: 10,
    },
    ...columns.map(autoFill),
    {
      name: "createdAt",
      dataType: "DATE",
      required: true,
      description: "创建时间",
      relationshipType: undefined,
      relatedToTableId: undefined,
      enumValues: undefined,
      ui: {
        mask: "0010101001",
        width: 200,
        component: "DatePicker",
        disabled: true,
      },
      orderno: 1100,
    },
    {
      name: "updatedAt",
      dataType: "DATE",
      required: true,
      description: "更新时间",
      relationshipType: undefined,
      relatedToTableId: undefined,
      enumValues: undefined,
      ui: {
        mask: "0010101001",
        width: 200,
        component: "DatePicker",
        disabled: true,
      },
      orderno: 1200,
    },
  ];
};

// 系统表字段配置
export const systemTables = [
  {
    name: "dynamic_tables",
    description: "表",
    alias_name: "table",
    columns: defaultColumns([
      {
        name: "name",
        dataType: "STRING",
        required: true,
        description: "表",
        relationshipType: undefined,
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: {
          mask: "1111111111",
          width: 200,
          component: "Input",
        },
      },
      {
        name: "description",
        dataType: "STRING",
        required: true,
        description: "描述",
        relationshipType: undefined,
        relatedToTableId: undefined,
        enumValues: undefined,
        ak: true,
        dk: true,
        ui: {
          mask: "1111111111",
          width: 200,
          component: "Input",
        },
      },
      {
        name: "alias_name",
        dataType: "STRING",
        required: true,
        description: "表别名",
        relationshipType: undefined,
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: {
          mask: "1111111111",
          width: 200,
          component: "Input",
        },
      },
    ]),
  },
  {
    name: "dynamic_columns",
    description: "字段",
    alias_name: "column",
    columns: defaultColumns([
      {
        name: "name",
        dataType: "STRING",
        required: true,
        description: "数据库名称",
        relationshipType: undefined,
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: {
          mask: "1111111111",
          width: 200,
          component: "Input",
        },
      },
      {
        name: "description",
        dataType: "STRING",
        required: true,
        description: "描述",
        relationshipType: undefined,
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: undefined,
      },
      {
        name: "dataType",
        dataType: "STRING",
        required: true,
        description: "字段类型",
        relationshipType: undefined,
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: undefined,
      },
      {
        name: "tableId",
        dataType: "INTEGER",
        required: true,
        description: "所属表",
        relationshipType: undefined,
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: {
          component: "FkPicker",
          table: "table",
          componentProps: {
            table: "table",
          },
        },
      },
      {
        name: "relationshipType",
        dataType: "STRING",
        required: true,
        description: "外键关联类型",
        relationshipType: undefined,
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: undefined,
      },
      {
        name: "relatedToTableId",
        dataType: "INTEGER",
        required: true,
        description: "外键表",
        relationshipType: undefined,
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: undefined,
      },
      {
        name: "enumValues",
        dataType: "JSON",
        required: true,
        description: "枚举值",
        relationshipType: undefined,
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: undefined,
      },
      {
        name: "ui",
        dataType: "JSON",
        required: true,
        description: "界面配置",
        relationshipType: undefined,
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: undefined,
      },
      {
        name: "orderno",
        dataType: "INTEGER",
        required: true,
        description: "序号",
        relationshipType: undefined,
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: undefined,
      },
    ]),
  },
  {
    name: "users",
    description: "用户",
    alias_name: "users",
    columns: defaultColumns([
      {
        name: "username",
        dataType: "STRING",
        required: true,
        description: "用户名",
        relationshipType: undefined,
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: {
          mask: "1111111111",
          width: 200,
          component: "Input",
        },
      },
      {
        name: "realName",
        dataType: "STRING",
        required: true,
        description: "姓名",
        relationshipType: undefined,
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: undefined,
      },
    ]),
  },
  {
    name: "roles",
    description: "角色",
    alias_name: "roles",
    columns: defaultColumns([
      {
        name: "name",
        dataType: "STRING",
        required: true,
        description: "名称",
        relationshipType: undefined,
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: {
          mask: "1111111111",
          width: 200,
          component: "Input",
        },
      },
      {
        name: "description",
        dataType: "STRING",
        required: true,
        description: "描述",
        relationshipType: undefined,
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: undefined,
      },
      {
        name: "perms",
        dataType: "STRING",
        required: false,
        is_virtual: true,
        description: "授权",
        relationshipType: undefined,
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: {
          mask: "0011000000",
          width: 200,
          component: "PermissionPicker",
          componentProps: {

          }
        },
      },
    ]),
  },
];

export const initSystemData = async () => {
  for (const table of systemTables) {
    const exists = await DynamicTable.findOne({ where: { name: table.name } });
    let tableId = exists?.id;
    if (!exists) {
      // 创建表
      let tableRow = await DynamicTable.create({
        tenantId: 1,
        name: table.name,
        alias_name: table.alias_name || table.name,
        description: table.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      tableId = tableRow.id;
    } else {
      await DynamicTable.update(table, { where: { id: tableId } });
    }

    // 初始化列
    for (const column of table.columns) {
      if(column.is_virtual) continue; // 跳过虚拟列
      const existsColumn = await DynamicColumn.findOne({
        where: { name: column.name, tableId },
      });
      if (!existsColumn) {
        await DynamicColumn.create({
          tenantId: 1,
          tableId,
          ...column,
        });
      } else {
        await DynamicColumn.update(column, { where: { name: column.name } });
      }
    }
  }
};

export const adminUser = {
  name: "root",
  password: "root123",
  tenant: "top",
  permissions: ["data:*:*", "action:*:*"],
  roles: ["admin"],
};

export const initAdminUser = async () => {
  let [tenant] = await Tenant.findOrCreate({
    where: { name: adminUser.tenant },
    defaults: {
      description: "系统租户",
    },
  });
  // 创建角色
  const [adminRole] = await Role.findOrCreate({
    where: { name: "admin" },
    defaults: { tenantId: tenant.id, description: "系统管理员角色" },
  });

  // 创建权限
  for (const permission of adminUser.permissions) {
    let [perm] = await Permission.findOrCreate({
      where: { action: permission },
    });
    adminRole.addPermission(perm.id);
  }

  // 创建用户
  const [user] = await User.findOrCreate({
    where: { username: adminUser.name, tenantId: tenant.id },
    defaults: {
      realName: "系统管理员",
      password: adminUser.password,
      tenantId: tenant.id,
    },
  });

  // 关联角色
  await user.addRole(adminRole);
};
