/**
 * CLI entry point
 */

import { Command } from 'commander';
import { ConfigManager } from './services';
import { startApp } from './index';

const program = new Command();

program
  .name('omo-monitor')
  .description('Terminal TUI monitor for OpenCode + oh-my-openagent (omo)')
  .version('1.0.0')
  .option('-r, --refresh <seconds>', 'Refresh interval in seconds', '2')
  .option('-t, --theme <theme>', 'Theme (dark/light)', 'dark')
  .option('--db <path>', 'SQLite database path')
  .option('--no-mouse', 'Disable mouse support')
  .option('--debug', 'Enable debug mode')
  .option('--config <path>', 'Config file path')
  .action(async (options) => {
    // Load config
    const configManager = new ConfigManager(options.config);
    const config = configManager.load();

    // Apply CLI options
    if (options.refresh) {
      configManager.update({
        refresh: {
          ...config.refresh,
          interval: parseInt(options.refresh) * 1000,
        },
      });
    }

    if (options.theme) {
      configManager.update({
        display: {
          ...config.display,
          theme: options.theme as 'dark' | 'light',
        },
      });
    }

    if (options.db) {
      configManager.update({
        database: {
          path: options.db,
        },
      });
    }

    // Start app
    await startApp(configManager);
  });

program.parse();
