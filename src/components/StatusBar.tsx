/**
 * Status Bar component - displays shortcuts and status info
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Config } from '../types';
import { formatTimestamp } from '../utils';

interface StatusBarProps {
  keybindings: Config['keybindings'];
  agentCount: number;
  runningCount: number;
  lastRefresh: Date;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  keybindings,
  agentCount,
  runningCount,
  lastRefresh,
}) => {
  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>{"─".repeat(80)}</Text>
      </Box>
      <Box justifyContent="space-between">
        <Box>
          <Text>
            <Text color="yellow">[{keybindings.quit}]</Text>
            <Text dimColor>退出 </Text>
            <Text color="yellow">[↑↓]</Text>
            <Text dimColor>选择 </Text>
            <Text color="yellow">[Tab]</Text>
            <Text dimColor>面板 </Text>
            <Text color="yellow">[{keybindings.refresh}]</Text>
            <Text dimColor>刷新</Text>
          </Text>
        </Box>
        <Box>
          <Text dimColor>
            Agents: {agentCount} | Running: {runningCount} | {formatTimestamp(lastRefresh)}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
