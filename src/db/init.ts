import { ColumnDataTypes } from "@/utils";
import { DynamicColumn, DynamicTable, TableAction, TableCategory } from "./models";
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
  let defaultComponentMap = {
    [ColumnDataTypes.INTEGER]: "InputNumber",
    [ColumnDataTypes.QTY]: "InputNumber",
  }
  return {
    ...column,
    orderno: column.orderno || (index + 1) * 10,
    ui: {
      mask: "1111111111",
      width: 100,
      component: defaultComponentMap[column.dataType] || "Input",
      filterOp: getColumnFilterOp(column),
      ...column.ui,
    },
  };
};

const idOf = (arr = [], name = "", key = "name") => {
  const idx = arr.findIndex((i) => i[key] === name);
  if (idx === -1) return null;
  return idx + 1;
};

export const defaultColumns = (columns = []) => {
  // 如果 column中没有字段维护了 ak dk  则自动用第一个字段做 ak dk
  return [
    {
      name: "id",
      dataType: ColumnDataTypes.ID,
      required: false,
      description: "ID",
      relatedToTableId: undefined,

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
      name: "logDivider",
      dataType: ColumnDataTypes.VIRTUAL,
      required: false,
      description: "日志信息",
      relatedToTableId: undefined,

      ui: {
        mask: "0010000000",
        width: 200,
        component: "Divider",
      },
      orderno: 1000,
    },
    {
      name: "createdBy",
      dataType: ColumnDataTypes.ID,
      required: false,
      description: "创建人",
      relatedToTableId: "users",

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
      required: false,
      description: "创建时间",
      relatedToTableId: undefined,

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
      required: false,
      description: "修改人",
      relatedToTableId: "users",

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

      ui: {
        mask: "0010101001",
        width: 200,
        component: "RadioGroup",
        componentProps: {
          buttonStyle: "solid",
          options: [
            { label: "是", value: true },
            { label: "否", value: false },
          ],
          optionType: "button",
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
    type: "catelog",
    parentId: null,
    meta: {
      icon: "lucide:layout-dashboard",
    },
    path: "/dashboard",
  },
  {
    name: "用户管理",
    description: "",
    type: "catelog",
    parentId: null,
    meta: {
      icon: "tabler:user",
    },
    path: "/account",
  },
  {
    name: "开发平台",
    description: "",
    type: "catelog",
    parentId: null,
    meta: {
      icon: "carbon:development",
    },
    path: "/system",
  },
  {
    name: "分析页",
    description: "",
    type: "menu",
    parentId: "概览",
    meta: {
      icon: "lucide:area-chart",
    },
    path: "/analytics",
  },
  {
    name: "工作台",
    description: "",
    type: "menu",
    parentId: "概览",
    meta: {
      icon: "carbon:workspace",
    },
    path: "/workspace",
  },
  {
    name: "组件页",
    description: "",
    type: "menu",
    parentId: "概览",
    meta: {
      icon: "uiw:component",
    },
    path: "/playground",
  },
];

export const initTableCategories = async () => {
  for (let category of tableCategories) {
    category.parentId =
      categoryIdOf(category?.parentId)?.toLocaleString() || null;
    const [cat, created] = await TableCategory.findOrCreate({
      where: { name: category.name },
      defaults: {
        tenantId: 1,
        description: category.description,
        parentId: categoryIdOf(category?.parentId) || null,
        meta: category.meta || {},
      },
    });
    if (created) {
      await TableCategory.update(category, {
        where: { id: cat.id },
      });
    }
  }
};

// 系统表字段配置
export const systemTables = [
  {
    name: "dynamic_tables",
    description: "表",
    alias_name: "table",
    defaultSort: "orderno-asc",
    categoryId: categoryIdOf("开发平台"),
    actions:[
      {
        type: 'form',
        name: '应用',
        resource: 'syncTable',
      },
      {
        type: 'list',
        name: '应用',
        resource: 'syncTable',
      },
    ],
    columns: defaultColumns([
      {
        name: "name",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "表",
        relatedToTableId: undefined,
        ui: {
          mask: "1111111111",
          width: 200,
          component: "Input",
          rules: [
            { type: 'identifier', message: '只能是字母、数字、下划线，且开头必须是字母或下划线'}
          ]
        },
      },
      {
        name: "description",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "描述",
        relatedToTableId: undefined,

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
        required: false,
        description: "表别名",
        relatedToTableId: undefined,

        ui: {
          mask: "1111111111",
          width: 200,
          component: "Input",
          rules: [
            { type: 'identifier', message: '只能是字母、数字、下划线，且开头必须是字母或下划线'}
          ]
        },
      },
      {
        name: "categoryId",
        dataType: ColumnDataTypes.ID,
        required: true,
        description: "表类别",
        relatedToTableId: "table_categories",
        ui: {
          component: "FkPicker",
          table: "table_categories",
          componentProps: {
            table: "table_categories",
          },
        },
      },
      {
        name: "hideMenu",
        dataType: ColumnDataTypes.BOOLEAN,
        required: false,
        description: "隐藏菜单",
        relatedToTableId: undefined,

        ui: {
          component: "Checkbox",
        },
      },
      {
        name: "defaultSort",
        dataType: ColumnDataTypes.STRING,
        required: false,
        description: "默认排序",
        relatedToTableId: undefined,
        ui: {
          mask: "1111111111",
          width: 200,
          component: "Input",
          componentProps: {
            placeholder: "格式：[fileName]-[asc|desc],多个逗号分隔",
          },
        },
      },
      {
        name: "orderno",
        dataType: ColumnDataTypes.INTEGER,
        required: false,
        description: "序号",
        relatedToTableId: undefined,
        ui: undefined,
      },
      {
        name: "items",
        dataType: ColumnDataTypes.VIRTUAL,
        required: false,
        description: "表类别",
        relatedToTableId: "table_categories",

        ui: {
          mask: "0011000000",
          width: 0,
          component: "Items",
          hideLabel: true,
          dependencies: {},
          componentProps: {
            tabs: [
              {
                key: "tab1",
                table: "column",
                title: "字段",
                parentKey: "tableId",
                queryExtra: {},
              },
              {
                key: "tab2",
                table: "actions",
                title: "动作",
                parentKey: "tableId",
                queryExtra: {},
              },
            ],
          },
        },
      },
    ]),
  },
  {
    name: "dynamic_columns",
    description: "字段",
    alias_name: "column",
    defaultSort: "orderno-asc",
    categoryId: categoryIdOf("开发平台"),
    columns: defaultColumns([
      {
        name: "name",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "数据库名称",
        relatedToTableId: undefined,

        ak: true,
        dk: true,
        ui: {
          mask: "1111111111",
          width: 200,
          component: "Input",
          rules: [
            { type: 'identifier', message: '只能是字母、数字、下划线，且开头必须是字母或下划线'}
          ]
        },
      },
      {
        name: "description",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "描述",
        relatedToTableId: undefined,

        ui: undefined,
      },
      {
        name: "dataType",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "字段类型",
        relatedToTableId: undefined,

        ui: {
          component: "ColumnTypeInput",
        },
      },
      {
        name: "tableId",
        dataType: ColumnDataTypes.ID,
        required: true,
        description: "所属表",
        relatedToTableId: "dynamic_tables",

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
        required: false,
        description: "外键表",
        relatedToTableId: "dynamic_tables",

        ui: {
          component: "FkPicker",
          table: "table",
          componentProps: {
            table: "table",
          },
          dependencies: {
            show: 'values.dataType === "ID"',
            triggerFields: ["dataType"],
          },
        },
      },
      {
        name: "required",
        dataType: ColumnDataTypes.BOOLEAN,
        required: false,
        description: "必填",
        relatedToTableId: undefined,

        ui: {
          component: "Checkbox",
        },
      },
      {
        name: "ak",
        dataType: ColumnDataTypes.BOOLEAN,
        required: false,
        description: "输入键",
        relatedToTableId: undefined,

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

        ui: {
          component: "Checkbox",
        },
      },
      {
        name: "ui",
        dataType: ColumnDataTypes.JSON,
        required: false,
        description: "界面配置",
        relatedToTableId: undefined,

        ui: {
          mask: "0011001111",
          component: "UIInput",
          componentProps: {},
        },
      },
      {
        name: "orderno",
        dataType: ColumnDataTypes.INTEGER,
        required: false,
        description: "序号",
        relatedToTableId: undefined,

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

        ui: undefined,
      },
      {
        name: "password",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "密码",
        relatedToTableId: undefined,

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

        ui: undefined,
      },
      {
        name: "perms",
        dataType: ColumnDataTypes.VIRTUAL,
        required: false,
        description: "授权",
        relatedToTableId: undefined,

        ui: {
          mask: "0011000000",
          width: 200,
          component: "PermissionPicker",
          componentProps: {},
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
    name: "table_categories",
    description: "表类别",
    alias_name: "table_categories",
    categoryId: categoryIdOf("开发平台"),
    defaultSort: 'orderno-asc',
    columns: defaultColumns([
      {
        name: "name",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "名称",
        ak: true,
        dk: true,
        relatedToTableId: undefined,

        ui: {
          mask: "1111111111",
          width: 200,
          component: "Input",
        },
      },
      {
        name: "description",
        dataType: ColumnDataTypes.STRING,
        required: false,
        description: "描述",
        relatedToTableId: undefined,

        ui: {
          mask: "1111111111",
          width: 200,
          component: "Input",
        },
      },
      {
        name: "parentId",
        dataType: ColumnDataTypes.ID,
        required: false,
        description: "父类别",
        relatedToTableId: "table_categories",

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
        required: false,
        description: "界面配置",
        relatedToTableId: undefined,

        ui: {
          component: "MetaInput",
          componentProps: {},
        },
      },
      {
        name: "path",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "路径",
        relatedToTableId: undefined,

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
        required: false,
        description: "路由",
        relatedToTableId: undefined,

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
        required: false,
        description: "重定向",
        relatedToTableId: undefined,

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
        required: false,
        description: "序号",
        relatedToTableId: undefined,

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

        ak: true,
        dk: true,
        ui: {
          mask: "1111111111",
          width: 200,
          component: "Input",
        },
      },
    ]),
  },
  {
    name: "table_actions",
    description: "动作定义",
    alias_name: "actions",
    defaultSort: 'orderno-asc',
    categoryId: categoryIdOf("开发平台"),
    hideMenu: true,

    columns: defaultColumns([
      {
        name: "tableId",
        dataType: ColumnDataTypes.ID,
        required: true,
        description: "所属表",
        relatedToTableId: "dynamic_tables",

        ui: {
          component: "FkPicker",
          table: "table",
          componentProps: {
            table: "table",
          },
        },
      },
      {
        name: "type",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "类型",
        relatedToTableId: undefined,

        ak: true,
        dk: true,
        ui: {
          mask: "1111111111",
          width: 200,
          component: "Select",
          componentProps: {
            options: [
              { label: "表单动作", value: "form" },
              { label: "列表动作", value: "list" },
              { label: "明细动作", value: "item" },
            ],
          },
        },
      },
      {
        name: "name",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "名称",
        relatedToTableId: undefined,

        ui: {
          mask: "1111111111",
          width: 200,
          component: "Input",
        },
      },
      {
        name: "resource",
        dataType: ColumnDataTypes.STRING,
        required: true,
        description: "接口名称",
        relatedToTableId: undefined,

        ak: true,
        dk: true,
        ui: {
          mask: "1111111111",
          width: 200,
          component: "Input",
        },
      },
      {
        name: "btnUI",
        dataType: ColumnDataTypes.JSON,
        required: false,
        description: "按钮配置",
        relatedToTableId: undefined,

        ui: {
          mask: "0011001111",
          component: "BtnUIInput",
          componentProps: {},
        },
      },
      {
        name: "orderno",
        dataType: ColumnDataTypes.INTEGER,
        required: true,
        description: "序号",
        relatedToTableId: undefined,

        ui: undefined,
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
        categoryId: table.categoryId || null,
        defaultSort: table.defaultSort || null,
        hideMenu: table.hideMenu || false,
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
        await DynamicColumn.update(column, { where: { id: existsColumn?.id } });
      }
    }
    // 初始化动作
    for(let action of table.actions || []) {
      const existsAction = await TableAction.findOne({
        where: { type: action.type, resource: action.resource, tableId },
      });
      if(!existsAction) {
        await TableAction.create({
          tenantId: 1,
          tableId,
          ...action,
        });
      } else {
        await TableAction.update(action, { where: { id: existsAction.id } });
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
  await initTenantUser(adminUser);
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
};

function tableIdOf(name = "") {
  return idOf(systemTables, name, "name");
}

function categoryIdOf(name = "") {
  return idOf(tableCategories, name, "name");
}

export const tableInitColumns = () => {
  return defaultColumns().map((col) => ({
    ...col,
    relatedToTableId: tableIdOf(col.relatedToTableId) || null,
  }));
};
