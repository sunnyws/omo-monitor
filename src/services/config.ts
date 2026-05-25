/**
 * Configuration manager
 */

import fs from 'fs';
import path from 'path';
import { Config, DEFAULT_CONFIG } from '../types/config';

export class ConfigManager {
  private config: Config;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || this.getDefaultConfigPath();
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Get default config path
   */
  private getDefaultConfigPath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    return path.join(homeDir, '.config', 'omo-monitor', 'config.json');
  }

  /**
   * Load configuration from file
   */
  load(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(configData);
        this.config = this.mergeConfig(DEFAULT_CONFIG, parsed);
      } else {
        // Create default config file
        this.save();
      }
    } catch (error) {
      console.error('Failed to load config, using defaults:', error);
      this.config = { ...DEFAULT_CONFIG };
    }

    return this.config;
  }

  /**
   * Save configuration to file
   */
  save(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Config {
    return this.config;
  }

  /**
   * Update configuration
   */
  update(updates: Partial<Config>): void {
    this.config = this.mergeConfig(this.config, updates);
    this.save();
  }

  /**
   * Merge config objects deeply
   */
  private mergeConfig(base: Config, updates: Partial<Config>): Config {
    const result = { ...base };

    for (const key of Object.keys(updates) as Array<keyof Config>) {
      if (updates[key] !== undefined) {
        if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
          result[key] = { ...result[key], ...updates[key] } as any;
        } else {
          result[key] = updates[key] as any;
        }
      }
    }

    return result;
  }

  /**
   * Get database path with expanded home directory
   */
  getDatabasePath(): string {
    const dbPath = this.config.database.path;
    if (dbPath.startsWith('~')) {
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      return dbPath.replace('~', homeDir);
    }
    return dbPath;
  }
}
