/**
 * Database related type definitions
 */

export interface SessionRow {
  id: string;
  project_id: string | null;
  parent_id: string | null;
  slug: string | null;
  directory: string | null;
  title: string | null;
  version: string | null;
  share_url: string | null;
  summary_additions: number | null;
  summary_deletions: number | null;
  summary_files: number | null;
  summary_diffs: string | null;
  revert: string | null;
  permission: string | null;
  time_created: number;
  time_updated: number | null;
  time_compacting: number | null;
  time_archived: number | null;
  workspace_id: string | null;
  path: string | null;
  agent: string | null;
  model: string | null;
  cost: number | null;
  tokens_input: number | null;
  tokens_output: number | null;
  tokens_reasoning: number | null;
  tokens_cache_read: number | null;
  tokens_cache_write: number | null;
}

export interface MessageRow {
  id: string;
  session_id: string;
  time_created: number;
  time_updated: number | null;
  data: string;  // JSON string
}

export interface PartRow {
  id: string;
  message_id: string;
  session_id: string;
  time_created: number;
  time_updated: number | null;
  data: string;  // JSON string
}

export interface ToolCallData {
  type: 'tool';
  tool: string;
  callID: string;
  state: {
    status: 'completed' | 'error';
    input: Record<string, any>;
    output?: string;
    error?: string;
    time?: {
      start: number;
      end?: number;
    };
  };
}

export interface MessageData {
  role: 'user' | 'assistant' | 'system';
  modelID?: string;
  providerID?: string;
  agent?: string;
  cost?: number;
  tokens?: {
    input: number;
    output: number;
    reasoning: number;
  };
  content?: string | Array<{
    type: string;
    text?: string;
    tool_use?: any;
    tool_result?: any;
  }>;
}
