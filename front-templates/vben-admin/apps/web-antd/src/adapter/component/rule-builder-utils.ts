
const cloneDeep = (obj) => JSON.parse(JSON.stringify(obj));

const operatorLabels = {
  equals: '等于',
  not: '不等于',
  gt: '大于',
  gte: '大于等于',
  lt: '小于',
  lte: '小于等于',
  in: '包含',
  notIn: '不包含',
  contains: '模糊匹配',
  startsWith: '开头是',
  endsWith: '结尾是',
  exists: '存在', // Added for exists condition
};

function getFieldLabel(fieldName, tableConfig) {
  const column = tableConfig.columns.find((c) => c.fieldName === fieldName);
  return column ? column.label : fieldName;
}

export function generateRuleDescription(ruleBuilder, tableConfig) {
  if (!ruleBuilder || !ruleBuilder.conditions || ruleBuilder.conditions.length === 0) {
    return '无任何规则';
  }

  function parseGroup(group, level = 0) {
    if (!group || !group.conditions || group.conditions.length === 0) {
      return '';
    }
    const logic = ` ${group.logic === 'AND' ? '并且' : '或者'} `;
    const indent = '  '.repeat(level);

    const parts = group.conditions.map((item) => {
      if (item.logic) {
        return `${indent}(\n${parseGroup(item, level + 1)}\n${indent})`;
      }
      if (item.operator === 'exists') {
        const fieldLabel = getFieldLabel(item.field, tableConfig);
        const subDescription = parseGroup(item.value, level + 1);
        return `${indent}存在关联 ${fieldLabel} 满足: (\n${subDescription}\n${indent})`;
      }
      const fieldLabel = getFieldLabel(item.field, tableConfig);
      const opLabel = operatorLabels[item.operator] || item.operator;
      return `${indent}${fieldLabel} ${opLabel} "${item.value}"`;
    });

    return parts.join(logic);
  }

  return parseGroup(ruleBuilder);
}

export function convertToSequelize(ruleBuilder) {
  if (!ruleBuilder || !ruleBuilder.conditions || ruleBuilder.conditions.length === 0) {
    return {};
  }

  // Deep clone to avoid modifying the original ruleBuilder state
  const builder = cloneDeep(ruleBuilder);

  function transformGroup(group) {
    if (!group.conditions) return group;
    // Replace field names with '$...$' syntax for Sequelize
    group.conditions.forEach((item) => {
      if (item.field) {
        if (item.operator === 'exists' && item.value && item.value.logic) {
          // Recursively transform the sub-group for 'exists' condition
          transformGroup(item.value);
        }
        // This is a simple transformation. For nested relations like 'user.name',
        // it would become '$user.name$'. The backend needs to handle this.
        item.field = `$${item.field}$`;
      } else if (item.logic) {
        transformGroup(item);
      }
    });
    return group;
  }

  return transformGroup(builder);
}
