/**
 * Database service - session-based management
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { Agent, ToolCall, FileOperation } from '../types/agent';
import { SessionRow, PartRow, ToolCallData } from '../types/database';

export interface Session {
  id: string;
  title: string;
  mainAgent: string;
  model: string;
  startTime: Date;
  duration: number;
  isRunning: boolean;
  agentCount: number;
  tokens: {
    input: number;
    output: number;
  };
}

export class DatabaseService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || this.getDefaultDbPath();
  }

  private getDefaultDbPath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    return path.join(homeDir, '.local', 'share', 'opencode', 'opencode.db');
  }

  connect(): boolean {
    try {
      if (!fs.existsSync(this.dbPath)) {
        console.error(`Database not found: ${this.dbPath}`);
        return false;
      }
      this.db = new Database(this.dbPath, { readonly: true });
      return true;
    } catch (error) {
      console.error('Failed to connect to database:', error);
      return false;
    }
  }

  disconnect(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Get sessions - only parent sessions (no parent_id)
   */
  getSessions(limit = 10): Session[] {
    if (!this.db) return [];

    try {
      // 只获取父会话（没有 parent_id 的会话）
      const sessions = this.db.prepare(`
        SELECT 
          id, title, agent, model, time_created, time_updated, time_archived,
          tokens_input, tokens_output
        FROM session
        WHERE parent_id IS NULL OR parent_id = ''
        ORDER BY time_created DESC
        LIMIT ?
      `).all(limit) as any[];

      return sessions.map(s => this.parseSession(s));
    } catch (error) {
      console.error('Failed to get sessions:', error);
      return [];
    }
  }

  /**
   * Get child sessions (agents) within a parent session
   */
  getSessionAgents(sessionId: string): Agent[] {
    if (!this.db) return [];

    try {
      // 获取该会话的所有子会话
      const childSessions = this.db.prepare(`
        SELECT id, agent, model, title, time_created, time_updated, time_archived,
               tokens_input, tokens_output, tokens_reasoning, cost
        FROM session
        WHERE parent_id = ?
        ORDER BY time_created ASC
      `).all(sessionId) as SessionRow[];

      // 如果没有子会话，返回自身
      if (childSessions.length === 0) {
        const session = this.db.prepare(`
          SELECT id, agent, model, title, time_created, time_updated, time_archived,
                 tokens_input, tokens_output, tokens_reasoning, cost
          FROM session
          WHERE id = ?
        `).get(sessionId) as SessionRow | undefined;

        if (session) {
          return [this.parseAgent(session)];
        }
      }

      return childSessions.map(a => this.parseAgent(a));
    } catch (error) {
      console.error('Failed to get session agents:', error);
      return [];
    }
  }

  /**
   * Get agent details with tool calls
   */
  getAgentDetails(sessionId: string): Agent | null {
    if (!this.db) return null;

    try {
      const session = this.db.prepare(`
        SELECT id, agent, model, title, time_created, time_updated, time_archived,
               tokens_input, tokens_output, tokens_reasoning, cost
        FROM session
        WHERE id = ?
      `).get(sessionId) as SessionRow | undefined;

      if (!session) return null;

      const agent = this.parseAgent(session);
      agent.toolCalls = this.getToolCalls(sessionId, 50);
      agent.fileOps = this.getFileOperations(sessionId);
      return agent;
    } catch (error) {
      console.error('Failed to get agent details:', error);
      return null;
    }
  }

  /**
   * Get all activity logs for a session (messages + parts)
   */
  getToolCalls(sessionId: string, limit = 50): ToolCall[] {
    if (!this.db) return [];

    try {
      const activities: ToolCall[] = [];

      // 1. 获取 messages (模型调用)
      const messages = this.db.prepare(`
        SELECT time_created, data
        FROM message
        WHERE session_id = ?
        ORDER BY time_created ASC
      `).all(sessionId) as PartRow[];

      for (const msg of messages) {
        try {
          const data = JSON.parse(msg.data);
          const role = data.role;
          const modelID = data.modelID;

          if (role === 'assistant' && modelID) {
            activities.push({
              time: new Date(msg.time_created),
              tool: '🤖 模型调用',
              status: 'completed',
              info: modelID,
            });
          }
        } catch {}
      }

      // 2. 获取 parts (工具调用、推理、文本)
      const parts = this.db.prepare(`
        SELECT time_created, data
        FROM part
        WHERE session_id = ? 
        ORDER BY time_created ASC
        LIMIT ?
      `).all(sessionId, limit) as PartRow[];

      for (const part of parts) {
        const activity = this.parseActivity(part);
        if (activity) {
          activities.push(activity);
        }
      }

      // 按时间排序
      activities.sort((a, b) => a.time.getTime() - b.time.getTime());

      return activities;
    } catch (error) {
      console.error('Failed to get tool calls:', error);
      return [];
    }
  }

  /**
   * Get file operations for a session
   */
  getFileOperations(sessionId: string): FileOperation[] {
    if (!this.db) return [];

    try {
      const parts = this.db.prepare(`
        SELECT data
        FROM part
        WHERE session_id = ? AND json_extract(data, '$.type') = 'tool'
      `).all(sessionId) as PartRow[];

      const fileMap = new Map<string, FileOperation>();

      for (const part of parts) {
        try {
          const data: ToolCallData = JSON.parse(part.data);
          const tool = data.tool;
          const input = data.state?.input || {};

          if (['read', 'edit', 'write'].includes(tool)) {
            const filePath = input.filePath || '';
            if (filePath) {
              const fileName = filePath.split('/').pop() || filePath;
              const existing = fileMap.get(fileName) || {
                path: fileName,
                reads: 0,
                writes: 0,
                edits: 0,
              };

              if (tool === 'read') existing.reads++;
              else if (tool === 'write') existing.writes++;
              else if (tool === 'edit') existing.edits++;

              fileMap.set(fileName, existing);
            }
          }
        } catch {
          // Skip
        }
      }

      return Array.from(fileMap.values());
    } catch (error) {
      console.error('Failed to get file operations:', error);
      return [];
    }
  }

  /**
   * Parse session row to Session interface
   */
  private parseSession(row: any): Session {
    let modelData: { id?: string } = {};
    try {
      modelData = row.model ? JSON.parse(row.model) : {};
    } catch {}

    const now = Date.now();
    const startTime = row.time_created;
    const lastUpdate = row.time_updated || startTime;
    const isRunning = !row.time_archived && (now - lastUpdate < 30000);

    return {
      id: row.id,
      title: row.title || 'N/A',
      mainAgent: row.agent || 'unknown',
      model: modelData.id || 'unknown',
      startTime: new Date(startTime),
      duration: now - startTime,
      isRunning,
      agentCount: 1,
      tokens: {
        input: row.tokens_input || 0,
        output: row.tokens_output || 0,
      },
    };
  }

  /**
   * Parse session row to Agent interface
   */
  private parseAgent(row: SessionRow): Agent {
    let modelData: { id?: string; providerID?: string } = {};
    try {
      modelData = row.model ? JSON.parse(row.model) : {};
    } catch {}

    const now = Date.now();
    const startTime = row.time_created;
    const lastUpdate = row.time_updated || startTime;
    const isRunning = !row.time_archived && (now - lastUpdate < 30000);

    return {
      id: row.id,
      name: row.agent || 'unknown',
      status: isRunning ? 'running' : (row.time_archived ? 'completed' : 'idle'),
      task: row.title || 'N/A',
      model: modelData.id || 'unknown',
      provider: modelData.providerID || 'unknown',
      startTime: new Date(startTime),
      duration: now - startTime,
      tokens: {
        input: row.tokens_input || 0,
        output: row.tokens_output || 0,
        reasoning: row.tokens_reasoning || 0,
        cost: row.cost || 0,
      },
      toolCalls: [],
      fileOps: [],
    };
  }

  /**
   * Parse activity (tool call, reasoning, text, etc.)
   */
  private parseActivity(row: PartRow): ToolCall | null {
    try {
      const data = JSON.parse(row.data);
      const type = data.type;

      let tool = '';
      let info = '';
      let status = 'completed';

      if (type === 'tool') {
        // Tool call
        const state = data.state || {};
        const input = state.input || {};
        tool = data.tool || 'unknown';
        status = state.status || 'completed';

        const desc = input.description || '';
        const output = (state.output || '').toString().split('\n').filter((l: string) => l.trim()).join(' | ').substring(0, 120);

        if (tool === 'read') {
          const fp = input.filePath || '';
          // 去掉公共前缀，只保留相对路径
          const shortPath = fp.replace(/^\/Users\/[^/]+\/workspace\/[^/]+\//, '');
          info = shortPath;
          if (status === 'error') info += ' [错误]';
        } else if (tool === 'edit') {
          const fp = (input.filePath || '').replace(/^\/Users\/[^/]+\/workspace\/[^/]+\//, '');
          info = fp;
        } else if (tool === 'write') {
          const fp = (input.filePath || '').replace(/^\/Users\/[^/]+\/workspace\/[^/]+\//, '');
          info = fp;
        } else if (tool === 'grep') {
          const pattern = input.pattern || '';
          const path = (input.path || '').replace(/^\/Users\/[^/]+\/workspace\/[^/]+\//, '');
          info = `${pattern} in ${path}`;
          if (output) info += ` → ${output.substring(0, 80)}`;
        } else if (tool === 'glob') {
          info = input.pattern || '';
        } else if (tool === 'bash') {
          info = input.command || '';
          if (desc) info = `${desc} | ${info}`;
          if (output) info += ` → ${output.substring(0, 80)}`;
        } else if (tool === 'todowrite') {
          const todos = input.todos || [];
          info = todos.map((t: any) => `${t.status === 'completed' ? '✅' : '⬜'} ${t.content}`).join(' | ');
        } else if (tool === 'background_output') {
          info = `Task: ${input.task_id || ''}`;
          if (output) info += ` → ${output.substring(0, 100)}`;
        } else if (tool === 'background_task') {
          info = desc || input.command || '';
        } else {
          // 其他工具：展示 description + input 概要
          info = desc || JSON.stringify(input).substring(0, 100);
          if (output) info += ` → ${output.substring(0, 80)}`;
        }
      } else if (type === 'reasoning') {
        // Model reasoning - 完整文本
        tool = '🧠 推理';
        info = (data.text || '').replace(/\n/g, ' ').substring(0, 150);
      } else if (type === 'text') {
        // Text output
        const text = (data.text || '').replace(/\n/g, ' ');
        // 跳过 system-reminder 这类系统消息
        if (text.includes('system-reminder') || text.includes('SYSTEM DIRECTIVE')) {
          tool = '📋 系统消息';
          info = text.substring(0, 100);
        } else {
          tool = '💬 输出';
          info = text.substring(0, 150);
        }
      } else if (type === 'step-start') {
        tool = '▶ 步骤';
        info = `Step ${data.step || ''} 开始`;
      } else if (type === 'step-finish') {
        tool = '✓ 步骤';
        info = `Step ${data.step || ''} 完成`;
      } else {
        tool = `📋 ${type}`;
        info = '';
      }

      return {
        time: new Date(row.time_created),
        tool: tool,
        status: status as 'completed' | 'error',
        info: info,
      };
    } catch {
      return null;
    }
  }
}
