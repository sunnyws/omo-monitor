/**
 * Format utilities
 */

/**
 * Format duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Format timestamp to HH:mm:ss
 */
export function formatTimestamp(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format cost to currency string
 */
export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return '<$0.01';
  return `$${cost.toFixed(2)}`;
}

/**
 * Truncate string to max length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Get status icon
 */
export function getStatusIcon(status: string): string {
  switch (status) {
    case 'running':
      return '🟢';
    case 'idle':
      return '⚪';
    case 'completed':
      return '✅';
    case 'error':
      return '❌';
    default:
      return '⚪';
  }
}

/**
 * Get tool status icon
 */
export function getToolStatusIcon(status: string): string {
  return status === 'completed' ? '✅' : '❌';
}

/**
 * Calculate display width of a string (considering Chinese characters)
 * Chinese characters typically take 2 columns width
 */
export function getDisplayWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    // Check if character is Chinese/CJK
    if (/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(char)) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * Truncate string to fit within display width
 */
export function truncateToWidth(str: string, maxWidth: number): string {
  let width = 0;
  let result = '';
  for (const char of str) {
    const charWidth = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(char) ? 2 : 1;
    if (width + charWidth > maxWidth - 3) {
      return result + '...';
    }
    result += char;
    width += charWidth;
  }
  return result;
}

/**
 * Pad string to display width (considering Chinese characters)
 */
export function padToWidth(str: string, targetWidth: number): string {
  const currentWidth = getDisplayWidth(str);
  const padding = Math.max(0, targetWidth - currentWidth);
  return str + ' '.repeat(padding);
}
