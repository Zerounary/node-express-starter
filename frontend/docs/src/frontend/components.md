# 组件库与定制（Ant Design Vue + Vben）

本章聚焦组件库的使用规范、主题与样式定制、与 Vben 组件的协作方式，以及业务组件的组织范式。

## 1. 选型与原则

- UI 基座：Ant Design Vue
- 业务与场景组件：Vben 组件（@vben/common-ui、@vben/layouts、@vben/hooks 等）
- 原则
  - 优先复用，少造轮子
  - 展示组件与容器组件分层
  - Props/Emit 明确与文档化

## 2. 按需使用与封装

- 表单与表格
  - 复杂表单优先 VbenForm，减少模板代码
  - 表格（含列配置、服务端分页）优先 Vben 表格体系
- 弹窗与抽屉
  - 模态交互统一用 VbenModal/VbenDrawer，亲和表单/表格场景
- 业务封装
  - 将领域共用的表单/表格抽象为 XxxForm/XxxTable，参数化配置

示例（基于 Vben 表单）：
```vue
<script setup lang="ts">
import { VbenForm } from '@vben/common-ui';
const schema = [
  { field: 'name', label: '角色名称', component: 'Input', required: true },
  { field: 'desc', label: '描述', component: 'InputTextArea' }
];
</script>

<template>
  <VbenForm :schema="schema" @submit="(v)=>$emit('submit', v)" />
</template>
```

## 3. 主题与样式定制

- Antd 主题 token
  - 自定义品牌色、圆角、字号等
- TailwindCSS
  - 用原子类快速布局与间距，避免过多的局部 CSS
- 全局样式
  - 在 @vben/styles 或本地 styles 中统一变量与通用样式
- 建议
  - 以 CSS 变量与 token 为主做主题切换
  - 避免深度选择器强覆盖，优先配置化

## 4. 权限类组件与适配

- 权限选择器（示例：PermissionPicker.vue）
  - 输入：角色/权限树
  - 输出：用户勾选结果
  - 建议：与后端约定权限节点结构（id/label/children）
- 适配层（adapter）
  - 对第三方组件/图标库的统一封装，屏蔽差异与便于替换

## 5. 组件规范与可测试性

- Props/Emit/Slots
  - 明确类型与默认值
  - 避免过多双向绑定，降低耦合
- 无副作用渲染，便于测试
  - 可通过 data-testid 或 aria-* 辅助选择器
- 文档与注释
  - 关键组件在注释中阐明输入输出与边界场景

## 6. 性能与可维护性

- 按需引入与懒加载
- 列表虚拟化（按需）
- 避免在大组件中承载过多逻辑，拆分为更小的单元与 composable

——
延伸阅读：
- 开发流程与最佳实践：/frontend/development
- 测试方法与实现：/frontend/testing
- 与后端集成：/frontend/integration