export const parseArray = (array: string | string[]): string[] => {
  if (Array.isArray(array)) {
    return array;
  }

  try {
    const cleanedArray = array.replace(/'/g, '"').replace(/^\[|\]$/g, '');
    return JSON.parse(`[${cleanedArray}]`);
  } catch (error) {
    return array
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((item) => item.trim().replace(/^'|'$/g, ''));
  }
};

export const ensureArray = (field: string | string[]): string[] => {
  if (Array.isArray(field)) {
    return field;
  }

  try {
    return JSON.parse(field);
  } catch (error) {
    return field.split(',').map((item) => item.trim());
  }
};

export const handleEmptyValues = (
  value: string | undefined,
): string | number | null => {
  if (value === undefined || value === '') {
    return null;
  }
  if (!isNaN(Number(value))) {
    return Number(value);
  }
  return value;
};
