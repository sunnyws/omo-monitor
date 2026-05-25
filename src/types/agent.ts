/**
 * Agent related type definitions
 */

export type AgentStatus = 'running' | 'idle' | 'completed' | 'error';

export interface Agent {
  id: string;                    // session ID
  name: string;                  // Agent 名称 (Sisyphus-Junior, Explore, etc.)
  status: AgentStatus;           // 运行状态
  task: string;                  // 任务描述
  model: string;                 // 使用的模型
  provider: string;              // 模型提供商
  startTime: Date;               // 开始时间
  duration: number;              // 运行时长 (ms)
  tokens: TokenUsage;            // Token 使用量
  toolCalls: ToolCall[];         // 工具调用列表
  fileOps: FileOperation[];      // 文件操作列表
}

export interface TokenUsage {
  input: number;
  output: number;
  reasoning: number;
  cost: number;
}

export interface ToolCall {
  time: Date;
  tool: string;
  status: 'completed' | 'error';
  info: string;
  input?: Record<string, any>;
  output?: string;
}

export interface FileOperation {
  path: string;
  reads: number;
  writes: number;
  edits: number;
}

export interface AgentSummary {
  total: number;
  running: number;
  idle: number;
  completed: number;
  error: number;
}
