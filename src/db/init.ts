import { ColumnDataTypes } from "@/utils";
import { DynamicColumn, DynamicTable, TableCategory } from "./models";
import { Permission, Role } from "./models/Role";
import Tenant from "./models/Tenant";
import User from "./models/User";

const getColumnFilterOp = (column) => {
  switch (column.dataType) {
    case ColumnDataTypes.DOCNO:
    case ColumnDataTypes.STRING:
    case ColumnDataTypes.TEXT:
    case ColumnDataTypes.JSON:
      return "like";
    case ColumnDataTypes.ID:
    case ColumnDataTypes.INTEGER:
      return "eq";
    case ColumnDataTypes.DATE:
    case ColumnDataTypes.DATENUMBER:
      return "eq";
    case ColumnDataTypes.BOOLEAN:
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

const idOf = (arr = [], name = '', key = 'name') => {
  const idx = arr.findIndex((i) => i[key] === name);
  if (idx === -1) return null;
  return idx + 1;
}


export const defaultColumns = (columns = []) => {
  // 如果 column中没有字段维护了 ak dk  则自动用第一个字段做 ak dk
  return [
    {
      name: "id",
      dataType: ColumnDataTypes.ID,
      required: true,
      description: "ID",
      relatedToTableId: undefined,
      enumValues: undefined,
      ui: {
        mask: "0000000000",
        width: 100,
        component: "Input",
        disabled: true,
      },
      orderno: 9,
    },
    ...columns.map(autoFill),
    {
      name: "createdBy",
      dataType: ColumnDataTypes.ID,
      required: true,
      description: "创建人",
      relatedToTableId: "users",
      enumValues: undefined,
      ui: {
        mask: "0010101001",
        width: 200,
        component: "FkPicker",
        componentProps: {
          table: "users",
        },
        disabled: true,
      },
      orderno: 1100,
    },
    {
      name: "createdAt",
      dataType: ColumnDataTypes.DATE,
      required: true,
      description: "创建时间",
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
    {
      name: "updatedBy",
      dataType: ColumnDataTypes.ID,
      required: true,
      description: "修改人",
      relatedToTableId: "users",
      enumValues: undefined,
      ui: {
        mask: "0010101001",
        width: 200,
        component: "FkPicker",
        componentProps: {
          table: "users",
        },
        disabled: true,
      },
      orderno: 1300,
    },
    {
      name: "updatedAt",
      dataType: ColumnDataTypes.DATE,
      required: false,
      description: "更新时间",
      relatedToTableId: undefined,
      enumValues: undefined,
      ui: {
        mask: "0010101001",
        width: 200,
        component: "DatePicker",
        disabled: true,
      },
      orderno: 1400,
    },
    {
      name: "isActive",
      dataType: ColumnDataTypes.BOOLEAN,
      required: false,
      description: "可用",
      relatedToTableId: undefined,
      enumValues: undefined,
      ui: {
        mask: "0010101001",
        width: 200,
        component: 'RadioGroup',
        componentProps: {
          buttonStyle: 'solid',
          options: [
            { label: '是', value: true },
            { label: '否', value: false },
          ],
          optionType: 'button',
        },
        disabled: true,
      },
      orderno: 1500,
    },
  ];
};

export const tableCategories = [
  {
    name: "概览",
    description: "",
    type: 'catelog',
    parentId: null,
    meta: {
      icon: "lucide:layout-dashboard"
    },
    path: '/dashboard'
  },
  {
    name: "用户管理",
    description: "",
    type: 'catelog',
    parentId: null,
    meta: {
      icon: "tabler:user"
    },
    path: '/account'
  },
  {
    name: "开发平台",
    description: "",
    type: 'catelog',
    parentId: null,
    meta: {
      icon: "carbon:development"
    },
    path: '/system'
  },
  {
    name: "分析页",
    description: "",
    type: 'menu',
    parentId: "概览",
    meta: {
      icon: "lucide:area-chart"
    },
    path: '/analytics',
  },
  {
    name: "工作台",
    description: "",
    type: 'menu',
    parentId: "概览",
    meta: {
      icon: "carbon:workspace"
    },
    path: '/workspace',
  },
  {
    name: "组件页",
    description: "",
    type: 'menu',
    parentId: "概览",
    meta: {
      icon: "uiw:component"
    },
    path: '/playground',
  },
]

export const initTableCategories = async () => {
  for (let category of tableCategories) {
    category.parentId = categoryIdOf(category?.parentId)?.toLocaleString() || null;
    const [cat, created] = await TableCategory.findOrCreate({
      where: { name: category.name },
      defaults: {
        tenantId: 1,
        description: category.description,
        parentId: categoryIdOf(category?.parentId) || null,
        meta: category.meta || {},
      }
    });
    if(created) {
      await TableCategory.update(category, {
        where: { id: cat.id },
      });
    }
  }
}

// 系统表字段配置
export const systemTables = [
  {
    name: "dynamic_tables",
    description: "表",
    alias_name: "table",
    categoryId: categoryIdOf("开发平台"),
    columns: defaultColumns([
      {
        name: "name",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "表",
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
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "描述",
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
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "表别名",
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: {
          mask: "1111111111",
          width: 200,
          component: "Input",
        },
      },
      {
        name: "categoryId",
        dataType: ColumnDataTypes.ID,
        required: true,
        description: "表类别",
        relatedToTableId: "table_categories",
        enumValues: undefined,
        ui: {
          component: "FkPicker",
          table: "table_categories",
          componentProps: {
            table: "table_categories",
          },
        },
      },
    ]),
  },
  {
    name: "dynamic_columns",
    description: "字段",
    alias_name: "column",
    categoryId: categoryIdOf("开发平台"),
    columns: defaultColumns([
      {
        name: "name",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "数据库名称",
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
        name: "description",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "描述",
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: undefined,
      },
      {
        name: "dataType",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "字段类型",
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: {
          component: "ColumnTypeInput"
        },
      },
      {
        name: "tableId",
        dataType: ColumnDataTypes.ID,
        required: true,
        description: "所属表",
        relatedToTableId: "dynamic_tables",
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
        name: "relatedToTableId",
        dataType: ColumnDataTypes.ID,
        required: true,
        description: "外键表",
        relatedToTableId: "dynamic_tables",
        enumValues: undefined,
        ui: {
          component: "FkPicker",
          table: "table",
          componentProps: {
            table: "table",
          },
          dependencies: {
            show: 'values.dataType === "ID"',
            triggerFields: ['dataType']
          }
        },
      },
      {
        name: "ak",
        dataType: ColumnDataTypes.BOOLEAN,
        required: false,
        description: "输入键",
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: {
          component: "Checkbox",
        },
      },
      {
        name: "dk",
        dataType: ColumnDataTypes.BOOLEAN,
        required: false,
        description: "显示键",
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: {
          component: "Checkbox",
        },
      },
      {
        name: "sortable",
        dataType: ColumnDataTypes.BOOLEAN,
        required: false,
        description: "可排序",
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: {
          component: "Checkbox",
        },
      },
      {
        name: "enumValues",
        dataType: ColumnDataTypes.JSON,
        required: true,
        description: "枚举值",
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: undefined,
      },
      {
        name: "ui",
        dataType: ColumnDataTypes.JSON,
        required: true,
        description: "界面配置",
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: {
          mask: "0011001111",
          component: "UIInput",
          componentProps: {
          },
        },
      },
      {
        name: "orderno",
        dataType: ColumnDataTypes.INTEGER,
        required: true,
        description: "序号",
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
    categoryId: categoryIdOf("用户管理"),
    columns: defaultColumns([
      {
        name: "username",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "用户名",
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
        name: "realName",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "姓名",
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: undefined,
      },
      {
        name: "password",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "密码",
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: {
          mask: "1111001111",
          width: 200,
          component: "InputPassword",
        },
      },
    ]),
  },
  {
    name: "roles",
    description: "角色",
    alias_name: "roles",
    categoryId: categoryIdOf("用户管理"),
    columns: defaultColumns([
      {
        name: "name",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "名称",
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
        name: "description",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "描述",
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: undefined,
      },
      {
        name: "perms",
        dataType: ColumnDataTypes.VIRTUAL,
        required: false,
        description: "授权",
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
  {
    name: "user_roles",
    description: "用户角色授权",
    alias_name: "user_roles",
    categoryId: categoryIdOf("用户管理"),
    columns: defaultColumns([
      {
        name: "userId",
        dataType: ColumnDataTypes.ID,
        required: true,
        description: "用户",
        relatedToTableId: "users",
        enumValues: undefined,
        ui: {
          component: "FkPicker",
          table: "users",
          componentProps: {
            table: "users",
          },
        },
      },
      {
        name: "roleId",
        dataType: ColumnDataTypes.ID,
        required: true,
        description: "角色",
        relatedToTableId: "roles",
        enumValues: undefined,
        ui: {
          component: "FkPicker",
          table: "roles",
          componentProps: {
            table: "roles",
          },
        },
      },
      
    ]),
  },
  {
    name: 'table_categories',
    description: '表类别',
    alias_name: 'table_categories',
    categoryId: categoryIdOf("开发平台"),
    columns: defaultColumns([
      {
        name: "name",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "名称",
        ak: true,
        dk: true,
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
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "描述",
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: {
          mask: "1111111111",
          width: 200,
          component: "Input",
        },
      },
      {
        name: "parentId",
        dataType: ColumnDataTypes.ID,
        required: true,
        description: "父类别",
        relatedToTableId: "table_categories",
        enumValues: undefined,
        ui: {
          component: "FkPicker",
          table: "table_categories",
          componentProps: {
            table: "table_categories",
          },
        },
      },
      {
        name: "meta",
        dataType: ColumnDataTypes.JSON,
        required: true,
        description: "界面配置",
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: {
          component: "MetaInput",
          componentProps: {
          },
        },
      },
      {
        name: "path",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "路径",
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
        name: "url",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "路由",
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
        name: "redirect",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "重定向",
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
        name: "orderno",
        dataType: ColumnDataTypes.INTEGER,
        required: true,
        description: "序号",
        relatedToTableId: undefined,
        enumValues: undefined,
        ui: undefined,
      },
    ]),
  },
    {
    name: "tenants",
    description: "租户",
    alias_name: "tenants",
    categoryId: categoryIdOf("开发平台"),
    columns: defaultColumns([
      {
        name: "name",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "名称",
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
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "描述",
        relatedToTableId: undefined,
        enumValues: undefined,
        ak: true,
        dk: true,
        ui: {
          mask: "1111111111",
          width: 200,
          component: "Input",
        },
      }])
    }
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
        categoryId: table.categoryId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      tableId = tableRow.id;
    } else {
      await DynamicTable.update(table, { where: { id: tableId } });
    }

  }

  // 先创建表后，再创建字段， 确保能创建字段关联
  for (const table of systemTables) {
    const exists = await DynamicTable.findOne({ where: { name: table.name } });
    let tableId = exists?.id;
    // 初始化列
    for (let column of table.columns) {
      // 转成ID
      column.relatedToTableId = tableIdOf(column.relatedToTableId) || null;
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
  await initTenantUser(adminUser)
};

export const initTenantUser = async (userConfig) => {
  let [tenant] = await Tenant.findOrCreate({
    where: { name: userConfig.tenant },
    defaults: {
      description: "系统租户",
      tenantId: 1,
    },
  });
  // 创建角色
  const [adminRole] = await Role.findOrCreate({
    where: { name: "admin" },
    defaults: { tenantId: tenant.id, description: "系统管理员角色" },
  });

  // 创建权限
  for (const permission of userConfig.permissions) {
    let [perm] = await Permission.findOrCreate({
      where: { action: permission },
    });
    adminRole.addPermission(perm.id);
  }

  // 创建用户
  const [user] = await User.findOrCreate({
    where: { username: userConfig.name, tenantId: tenant.id },
    defaults: {
      realName: "系统管理员",
      password: userConfig.password,
      tenantId: tenant.id,
    },
  });

  // 关联角色
  await user.addRole(adminRole);
}

function tableIdOf (name = '') {
  return idOf(systemTables, name, 'name');
}

function categoryIdOf (name = '') {
  return idOf(tableCategories, name, 'name');
}