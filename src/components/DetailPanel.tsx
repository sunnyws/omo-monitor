/**
 * Detail Panel component - displays agent details
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Agent, ToolCall, FileOperation } from '../types';
import {
  formatDuration,
  formatNumber,
  formatCost,
  formatTimestamp,
  truncate,
  getToolStatusIcon,
} from '../utils';

interface DetailPanelProps {
  agent: Agent | null;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({ agent }) => {
  if (!agent) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">📊 Details</Text>
        <Box>
          <Text dimColor>{"─".repeat(50)}</Text>
        </Box>
        <Text dimColor> 选择一个 Agent 查看详情</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Title */}
      <Box>
        <Text bold color="cyan">📊 {agent.name}</Text>
      </Box>
      <Box>
        <Text dimColor>{"─".repeat(50)}</Text>
      </Box>

      {/* Agent info - compact */}
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text dimColor>Model: </Text>
          <Text color="yellow">{agent.model}</Text>
        </Box>
        <Box>
          <Text dimColor>Task: </Text>
          <Text>{truncate(agent.task, 45)}</Text>
        </Box>
        <Box>
          <Text dimColor>Time: </Text>
          <Text color="green">{formatDuration(agent.duration)}</Text>
        </Box>
      </Box>

      {/* Tool calls */}
      <Box>
        <Text dimColor>🔧 Tools: </Text>
        <Text>{agent.toolCalls.length} calls</Text>
      </Box>
      <Box flexDirection="column" paddingLeft={2}>
        {agent.toolCalls.slice(-3).map((call, index) => (
          <ToolCallItem key={index} call={call} />
        ))}
      </Box>

      {/* File operations */}
      {agent.fileOps.length > 0 && (
        <>
          <Box marginTop={1}>
            <Text dimColor>📁 Files: </Text>
            <Text>{agent.fileOps.length} files</Text>
          </Box>
          <Box flexDirection="column" paddingLeft={2}>
            {agent.fileOps.slice(0, 2).map((op, index) => (
              <FileOpItem key={index} op={op} />
            ))}
          </Box>
        </>
      )}

      {/* Token stats */}
      <Box marginTop={1}>
        <Text dimColor>📊 Tokens: </Text>
        <Text color="green">{formatNumber(agent.tokens.input)}</Text>
        <Text dimColor> / </Text>
        <Text color="green">{formatNumber(agent.tokens.output)}</Text>
        <Text dimColor> | Cost: </Text>
        <Text color="yellow">{formatCost(agent.tokens.cost)}</Text>
      </Box>
    </Box>
  );
};

interface ToolCallItemProps {
  call: ToolCall;
}

const ToolCallItem: React.FC<ToolCallItemProps> = ({ call }) => {
  return (
    <Box>
      <Text dimColor>{formatTimestamp(call.time)}</Text>
      <Text> {getToolStatusIcon(call.status)} </Text>
      <Text color="blue">{call.tool}</Text>
      <Text dimColor> {truncate(call.info, 25)}</Text>
    </Box>
  );
};

interface FileOpItemProps {
  op: FileOperation;
}

const FileOpItem: React.FC<FileOpItemProps> = ({ op }) => {
  return (
    <Box>
      <Text>{truncate(op.path, 30)}</Text>
      <Text dimColor> r:{op.reads} w:{op.writes} e:{op.edits}</Text>
    </Box>
  );
};
