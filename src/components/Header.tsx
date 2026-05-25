/**
 * Header component - compact version
 */

import React from 'react';
import { Box, Text } from 'ink';
import { AgentStatus } from '../types';
import { getStatusIcon } from '../utils';

interface HeaderProps {
  version: string;
  refreshInterval: number;
  autoRefresh: boolean;
  mainAgent: string;
  mainModel: string;
  mainStatus: AgentStatus;
}

export const Header: React.FC<HeaderProps> = ({
  version,
  refreshInterval,
  autoRefresh,
  mainAgent,
  mainModel,
  mainStatus,
}) => {
  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color="cyan">🔍 omo-monitor</Text>
        <Text dimColor> v{version} </Text>
        <Text dimColor>|</Text>
        <Text> 主会话: </Text>
        <Text bold>{mainAgent}</Text>
        <Text dimColor> | </Text>
        <Text color="yellow">{mainModel}</Text>
        <Text dimColor> | </Text>
        <Text>{getStatusIcon(mainStatus)}</Text>
        <Text dimColor> | </Text>
        <Text color={autoRefresh ? 'green' : 'red'}>
          [{refreshInterval}s {autoRefresh ? 'auto' : 'manual'}]
        </Text>
      </Box>
      <Box>
        <Text dimColor>{"─".repeat(80)}</Text>
      </Box>
    </Box>
  );
};
