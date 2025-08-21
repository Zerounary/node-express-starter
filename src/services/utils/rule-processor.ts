/**
 * 判断是否为纯对象（非 Sequelize 的实例等）
 */
export function isPlainObject(value: any): boolean {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * 处理规则中的运行时变量占位符，如: "${currentUserId}"
 * 以纯函数形式实现，便于复用与测试
 */
export function processRules(rules: any, variables: Record<string, any>): any {
  if (Array.isArray(rules)) {
    return rules.map((item) => processRules(item, variables));
  }

  if (isPlainObject(rules)) {
    const newObj: { [key: string | symbol]: any } = {};
    const keys = [...Object.keys(rules), ...Object.getOwnPropertySymbols(rules)];
    for (const key of keys) {
      newObj[key as any] = processRules((rules as any)[key as any], variables);
    }
    return newObj;
  }

  if (typeof rules === 'string') {
    const match = rules.match(/^\$\{(.+)\}$/);
    if (match && Object.prototype.hasOwnProperty.call(variables, match[1])) {
      return variables[match[1]];
    }
  }

  return rules;
}