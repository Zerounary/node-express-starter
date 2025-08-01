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

export {
  debounce,
  ColumnDataTypes,
}
