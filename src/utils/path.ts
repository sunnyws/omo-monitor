/**
 * Path utilities
 */

import path from 'path';
import os from 'os';

/**
 * Expand home directory (~) in path
 */
export function expandHome(filePath: string): string {
  if (filePath.startsWith('~')) {
    return filePath.replace('~', os.homedir());
  }
  return filePath;
}

/**
 * Get filename from full path
 */
export function getFileName(filePath: string): string {
  return path.basename(filePath);
}

/**
 * Get directory from full path
 */
export function getDirectory(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * Check if path is absolute
 */
export function isAbsolute(filePath: string): boolean {
  return path.isAbsolute(filePath);
}

/**
 * Join paths
 */
export function joinPaths(...paths: string[]): string {
  return path.join(...paths);
}
