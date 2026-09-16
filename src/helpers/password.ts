export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

const isLower = (char: string) => char >= 'a' && char <= 'z';
const isUpper = (char: string) => char >= 'A' && char <= 'Z';
const isDigit = (char: string) => char >= '0' && char <= '9';
const isSymbol = (char: string) => char.trim().length > 0 && !isLower(char) && !isUpper(char) && !isDigit(char);

export function passwordIssues(value: string): string[] {
  const characters = [...value];
  const issues: string[] = [];

  if (characters.length < PASSWORD_MIN_LENGTH) {
    issues.push(`at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  if (characters.length > PASSWORD_MAX_LENGTH) {
    issues.push(`at most ${PASSWORD_MAX_LENGTH} characters`);
  }

  if (!characters.some(isLower)) {
    issues.push('one lowercase letter');
  }

  if (!characters.some(isUpper)) {
    issues.push('one uppercase letter');
  }

  if (!characters.some(isDigit)) {
    issues.push('one number');
  }

  if (!characters.some(isSymbol)) {
    issues.push('one special character');
  }

  return issues;
}
