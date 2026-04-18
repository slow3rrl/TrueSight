/**
 * Utility functions for generating and validating unique class codes
 */

/**
 * Generate a unique class code in format: ABC123-XY4
 * Format: 3 uppercase letters + 3 digits + hyphen + 2 letters + 1 digit
 */
export function generateClassCode(): string {
  const letters1 = generateRandomLetters(3);
  const numbers1 = generateRandomNumbers(3);
  const letters2 = generateRandomLetters(2);
  const number2 = generateRandomNumbers(1);

  return `${letters1}${numbers1}-${letters2}${number2}`;
}

/**
 * Validate class code format
 */
export function isValidClassCode(code: string): boolean {
  const pattern = /^[A-Z]{3}\d{3}-[A-Z]{2}\d$/;
  return pattern.test(code);
}

/**
 * Check if class code exists (mock - replace with actual DB check)
 */
export function classCodeExists(code: string, existingCodes: string[]): boolean {
  return existingCodes.includes(code);
}

/**
 * Generate unique class code that doesn't exist in the system
 */
export function generateUniqueClassCode(existingCodes: string[]): string {
  let code = generateClassCode();
  let attempts = 0;
  const maxAttempts = 100;

  while (classCodeExists(code, existingCodes) && attempts < maxAttempts) {
    code = generateClassCode();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique class code');
  }

  return code;
}

// Helper functions
function generateRandomLetters(length: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
}

function generateRandomNumbers(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

/**
 * Format class code for display (add spacing if needed)
 */
export function formatClassCode(code: string): string {
  return code.toUpperCase();
}
