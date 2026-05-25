/**
 * Main entry point
 */

import React from 'react';
import { render } from 'ink';
import { App } from './app';
import { ConfigManager } from './services';

export async function startApp(configManager: ConfigManager): Promise<void> {
  const config = configManager.getConfig();

  // Render the app
  const { waitUntilExit } = render(
    <App config={configManager} />,
    {
      // Enable mouse support if configured
      patchConsole: true,
    }
  );

  // Wait until user exits
  await waitUntilExit();
}

// Export for programmatic usage
export { App } from './app';
export { DatabaseService, ConfigManager } from './services';
export * from './types';
export * from './utils';
