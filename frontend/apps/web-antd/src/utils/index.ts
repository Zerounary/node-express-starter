import { ColumnDataTypes } from '../../../../../shared/ColumnDataTypes';

function debounce<T extends (...args: any[]) => Promise<any>>(func: T, delay: number): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout | null = null;
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    if (timeoutId) clearTimeout(timeoutId);
    return new Promise((resolve) => {
      timeoutId = setTimeout(async () => resolve(await func(...args)), delay);
    });
  };
}


// Helper function to safely create a function from a string
const createFunction = (code, ...args) => {
  if (!code) return undefined;
  try {
    return new Function(...args, `return ${code}`);
  } catch (e) {
    console.error('Failed to create function from string:', code, e);
    return undefined;
  }
};

// Helper function to apply dependencies
const applyDependencies = (col) => {
  if (!col.dependencies) {
    return col;
  }

  const { dependencies } = col;
  const newCol = { ...col };

  const dependencyFunctions = {
    if: createFunction(dependencies.if, 'values', 'formApi'),
    show: createFunction(dependencies.show, 'values', 'formApi'),
    disabled: createFunction(dependencies.disabled, 'values', 'formApi'),
    trigger: createFunction(dependencies.trigger, 'values', 'formApi'),
    rules: createFunction(dependencies.rules, 'values', 'formApi'),
    required: createFunction(dependencies.required, 'values', 'formApi'),
    componentProps: createFunction(dependencies.componentProps, 'values', 'formApi'),
  };

  return {
    ...newCol,
    dependencies: {
      triggerFields: dependencies.triggerFields,
      ...dependencyFunctions,
    }
  };
};

function downloadJson(jsonData, fileName = 'data.json', space = 2) {
    try {
        // 验证JSON数据
        if (typeof jsonData !== 'object' || jsonData === null) {
            throw new Error('请传入有效的JSON对象');
        }

        // 转换为JSON字符串并格式化
        const jsonStr = JSON.stringify(jsonData, null, space);

        // 创建Blob对象
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });

        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // 处理文件名（确保以.json结尾）
        const fileExt = '.json';
        a.download = fileName.endsWith(fileExt) ? fileName : `${fileName}${fileExt}`;

        // 触发下载
        document.body.appendChild(a);
        a.click();

        // 清理资源
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);

    } catch (error) {
        console.error('JSON下载失败:', error.message);
        throw error; // 允许外部捕获错误
    }
}

export {
  debounce,
  applyDependencies,
  ColumnDataTypes,
  downloadJson
}
