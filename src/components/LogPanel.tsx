/**
 * Log Panel component - displays real-time logs
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Agent, ToolCall } from '../types';
import { formatTimestamp, truncate, getToolStatusIcon } from '../utils';

interface LogPanelProps {
  agent: Agent | null;
  maxLines: number;
}

export const LogPanel: React.FC<LogPanelProps> = ({ agent, maxLines }) => {
  const logs = agent?.toolCalls || [];
  // 只显示最后几条日志，避免滚动
  const displayCount = Math.min(maxLines, 5);
  const displayLogs = logs.slice(-displayCount);

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        <Text bold color="cyan">📜 Logs</Text>
        <Text dimColor> ({logs.length} entries, showing last {displayCount})</Text>
      </Box>
      <Box>
        <Text dimColor>{"─".repeat(80)}</Text>
      </Box>

      {/* Log entries */}
      <Box flexDirection="column">
        {displayLogs.length === 0 ? (
          <Text dimColor> 暂无日志</Text>
        ) : (
          displayLogs.map((log, index) => (
            <LogEntry key={index} log={log} />
          ))
        )}
      </Box>
    </Box>
  );
};

interface LogEntryProps {
  log: ToolCall;
}

const LogEntry: React.FC<LogEntryProps> = ({ log }) => {
  return (
    <Box>
      <Text dimColor>{formatTimestamp(log.time)}</Text>
      <Text> {getToolStatusIcon(log.status)} </Text>
      <Text color="blue">{log.tool}: </Text>
      <Text>{truncate(log.info, 55)}</Text>
    </Box>
  );
};
