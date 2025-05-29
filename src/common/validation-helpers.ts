/**
 * Validation helper functions for type-safe runtime checks
 */

/**
 * Type guard to check if value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if value is a valid number (finite, not NaN)
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Type guard to check if value is a valid price (positive number)
 */
export function isValidPrice(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

/**
 * Type guard to check if value is a valid timestamp (positive number)
 */
export function isValidTimestamp(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

/**
 * Type guard to check if value is a valid currency ('USD')
 */
export function isValidCurrency(value: unknown): value is 'USD' {
  return value === 'USD';
}

/**
 * Check if object has only the expected properties (no additional properties)
 */
export function hasOnlyExpectedProperties(
  obj: Record<string, unknown>,
  expectedProps: string[]
): boolean {
  const objKeys = Object.keys(obj);
  const expectedSet = new Set(expectedProps);
  
  // Check if all object keys are in expected set
  return objKeys.every(key => expectedSet.has(key)) && objKeys.length === expectedProps.length;
}

/**
 * Check if object has all required properties
 */
export function hasRequiredProperties(
  obj: Record<string, unknown>,
  requiredProps: string[]
): boolean {
  return requiredProps.every(prop => prop in obj);
}