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

export {
  debounce,
  applyDependencies,
  ColumnDataTypes,
}
