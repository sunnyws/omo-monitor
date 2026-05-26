/**
 * Main entry point
 */

import React from 'react';
import { render } from 'ink';
import { App } from './app.js';
import { ConfigManager } from './services/config.js';
import { DatabaseService, Session } from './services/database.js';

export async function startApp(configManager: ConfigManager): Promise<void> {
  // 在渲染前同步初始化数据库并加载数据
  const dbPath = configManager.getDatabasePath();
  console.log('数据库路径:', dbPath);
  
  const dbService = new DatabaseService(dbPath);
  const connected = dbService.connect();
  console.log('数据库连接:', connected ? '成功' : '失败');
  
  const sessions: Session[] = connected ? dbService.getSessions(10) : [];
  console.log('初始会话数量:', sessions.length);

  // Render the app with pre-loaded data
  const { waitUntilExit } = render(
    <App 
      config={configManager}
      dbService={dbService}
      initialSessions={sessions}
    />,
    {
      patchConsole: true,
    }
  );

  await waitUntilExit();
}

// Export for programmatic usage
export { App } from './app.js';
export { DatabaseService, ConfigManager } from './services/index.js';
export * from './types/index.js';
export * from './utils/index.js';
