import { z, type ZodTypeAny } from 'zod';

/**
 * Parses the rules array and builds a Zod schema object.
 * @param rules The array of rule objects from the model.
 * @param defaultValue The default value for the field.
 * @returns A fully constructed Zod schema object.
 */
export function buildZodSchemaFromRules(
  rules?: ZodRule[],
  defaultValue?: any,
): ZodTypeAny {
  if (!rules || rules.length === 0) {
    let schema: ZodTypeAny = z.any();
    if (defaultValue !== undefined && defaultValue !== null && defaultValue !== '') {
      schema = schema.default(parseDefaultValue('any', defaultValue));
    }
    return schema;
  }

  let schema: ZodTypeAny;
  let baseType = '';

  // 1. Determine the base type (string, number, etc.)
  const typeRule = rules.find((r) =>
    ['string', 'number', 'boolean', 'date'].includes(r.type),
  );
  baseType = typeRule ? typeRule.type : 'string'; // Default to string if not specified

  switch (baseType) {
    case 'number':
      schema = z.number();
      break;
    case 'boolean':
      schema = z.boolean();
      break;
    case 'date':
      schema = z.date();
      break;
    case 'string':
    default:
      schema = z.string();
      break;
  }

  // 2. Apply validation rules
  const validationRules = rules.filter((r) => r.type !== baseType);

  validationRules.forEach((rule) => {
    let { type: methodName, value, message } = rule;
    const args: any[] = [];

    // --- Method Name Translations ---
    if (methodName === 'required' && baseType === 'string') {
      methodName = 'nonempty';
    } else if (methodName === 'required') {
      return; // Is default for other types, or handled by non-optional schema
    }

    if (baseType === 'number') {
      if (methodName === 'gte') methodName = 'min';
      if (methodName === 'lte') methodName = 'max';
    }

    if (methodName === 'identifier') {
      const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      const identifierArgs: any[] = [identifierRegex];
      if (message) {
        identifierArgs.push(message);
      }
      schema = (schema as z.ZodString).regex(
        ...(identifierArgs as [RegExp, string?]),
      );
      return; // Continue to the next rule
    }

    // --- Argument Formatting ---
    if (value !== undefined && value !== null && value !== '') {
      args.push(value);
    }

    if (message) {
      args.push(message);
    }

    // --- Apply Rule ---
    if (typeof (schema as any)[methodName] === 'function') {
      try {
        schema = (schema as any)[methodName](...args);
      } catch (e) {
        console.error(
          `Error applying Zod rule '${methodName}' with args:`,
          args,
          e,
        );
      }
    }
  });

  // 3. Apply the default value
  if (defaultValue !== undefined && defaultValue !== null && defaultValue !== '') {
    schema = schema.default(parseDefaultValue(baseType, defaultValue));
  }

  return schema;
}

function parseDefaultValue(baseType: string, defaultValue: any) {
  if (defaultValue === undefined || defaultValue === null || defaultValue === '') {
    return defaultValue;
  }

  let formattedDefault = defaultValue;
  if (baseType === 'string') {
    formattedDefault = String(defaultValue);
  } else if (baseType === 'number') {
    const num = parseFloat(defaultValue);
    if (!isNaN(num)) {
      formattedDefault = num;
    }
  } else if (baseType === 'boolean') {
    formattedDefault = ['true', '1', 'yes'].includes(
      String(defaultValue).toLowerCase(),
    );
  }
  // For date and other types, we might need more sophisticated parsing,
  // but for now, we pass it as is, and Zod will handle it.
  return formattedDefault;
}
