import {
  parseArray,
  ensureArray,
  handleEmptyValues,
} from '../helpers/helperFunctions';

describe('parseArray', () => {
  it('should parse array string correctly', () => {
    const arrayString = "['1', '2', '3']";
    const result = parseArray(arrayString);
    expect(result).toEqual(['1', '2', '3']);
  });

  it('should return input if already an array', () => {
    const array = ['1', '2', '3'];
    const result = parseArray(array);
    expect(result).toEqual(array);
  });
});

describe('ensureArray', () => {
  it('should ensure the input is an array', () => {
    const field = '1, 2, 3';
    const result = ensureArray(field);
    expect(result).toEqual(['1', '2', '3']);
  });

  it('should return input if already an array', () => {
    const array = ['1', '2', '3'];
    const result = ensureArray(array);
    expect(result).toEqual(array);
  });
});

describe('handleEmptyValues', () => {
  it('should return null for empty or undefined values', () => {
    expect(handleEmptyValues(undefined)).toBeNull();
    expect(handleEmptyValues('')).toBeNull();
  });

  it('should return number for numeric string', () => {
    expect(handleEmptyValues('123')).toBe(123);
  });

  it('should return string for non-numeric string', () => {
    expect(handleEmptyValues('abc')).toBe('abc');
  });
});
