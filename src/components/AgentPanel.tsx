/**
 * Agent Panel component - displays list of agents
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Agent } from '../types';
import { getStatusIcon, formatDuration, truncate } from '../utils';

interface AgentPanelProps {
  agents: Agent[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({
  agents,
  selectedIndex,
  onSelect,
}) => {
  const runningCount = agents.filter(a => a.status === 'running').length;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        <Text bold color="cyan">📋 Agents</Text>
        <Text dimColor> ({runningCount} running)</Text>
      </Box>
      <Box>
        <Text dimColor>{"─".repeat(38)}</Text>
      </Box>

      {/* Agent list */}
      <Box flexDirection="column">
        {agents.length === 0 ? (
          <Text dimColor> 暂无活跃的 Agent</Text>
        ) : (
          agents.map((agent, index) => (
            <AgentItem
              key={agent.id}
              agent={agent}
              isSelected={index === selectedIndex}
            />
          ))
        )}
      </Box>
    </Box>
  );
};

interface AgentItemProps {
  agent: Agent;
  isSelected: boolean;
}

const AgentItem: React.FC<AgentItemProps> = ({ agent, isSelected }) => {
  const textColor = isSelected ? 'white' : undefined;
  const bold = isSelected;

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={textColor} bold={bold}>
          {isSelected ? '▶ ' : '  '}
          {getStatusIcon(agent.status)} {agent.name}
        </Text>
      </Box>
      <Box paddingLeft={4}>
        <Text dimColor color={textColor}>
          {truncate(agent.task, 28)}
        </Text>
      </Box>
      <Box paddingLeft={4}>
        <Text dimColor color={textColor}>
          ⏱ {formatDuration(agent.duration)}
        </Text>
      </Box>
    </Box>
  );
};
