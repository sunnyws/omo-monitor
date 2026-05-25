/**
 * Main App component - Pure text rendering for clean log display
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { DatabaseService, ConfigManager, Session } from './services';
import { Agent, Config, ToolCall } from './types';
import { formatDuration, getStatusIcon, truncate, formatNumber, formatTimestamp, getToolStatusIcon } from './utils';

interface AppProps {
  config: ConfigManager;
}

type ViewLevel = 'sessions' | 'agents' | 'details';

/** 生成分隔线 */
function makeSep(w: number): string {
  return '─'.repeat(Math.max(10, w));
}

/** Format a single log line with fixed column widths */
function formatLogLine(index: number, call: ToolCall, toolWidth: number, infoWidth: number): string {
  const num = String(index).padStart(3);
  const time = formatTimestamp(call.time);
  const icon = call.status === 'completed' ? '✅' : '❌';
  const tool = call.tool.padEnd(toolWidth).substring(0, toolWidth);
  const info = call.info.replace(/\n/g, ' ').replace(/\s+/g, ' ').substring(0, infoWidth);
  return ` ${num} ${time} ${icon} ${tool}  ${info}`;
}

/** Pick color for tool name */
function getToolColor(tool: string): string {
  if (tool.includes('模型调用')) return 'magenta';
  if (tool.includes('推理')) return 'yellow';
  if (tool.includes('输出') || tool.includes('系统消息')) return 'gray';
  if (tool.includes('步骤') && tool.includes('▶')) return 'cyan';
  if (tool.includes('步骤') && tool.includes('✓')) return 'green';
  if (tool.includes('read') || tool.includes('edit') || tool.includes('write')) return 'blue';
  if (tool.includes('bash')) return 'red';
  if (tool.includes('grep') || tool.includes('glob')) return 'yellow';
  return 'white';
}

export const App: React.FC<AppProps> = ({ config: configManager }) => {
  const { exit } = useApp();
  const config = configManager.getConfig();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionAgents, setSessionAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const [viewLevel, setViewLevel] = useState<ViewLevel>('sessions');
  const [sessionIndex, setSessionIndex] = useState(0);
  const [agentIndex, setAgentIndex] = useState(0);
  const [logScrollOffset, setLogScrollOffset] = useState(0);

  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const dbService = React.useMemo(() => {
    const dbPath = configManager.getDatabasePath();
    const service = new DatabaseService(dbPath);
    service.connect();
    return service;
  }, [configManager]);

  if (sessions.length === 0 && dbService) {
    setSessions(dbService.getSessions(10));
  }

  useEffect(() => {
    if (selectedSession && dbService) {
      setSessionAgents(dbService.getSessionAgents(selectedSession.id));
    }
  }, [selectedSession, dbService]);

  useEffect(() => {
    if (viewLevel === 'details' && selectedAgent && dbService) {
      const details = dbService.getAgentDetails(selectedAgent.id);
      if (details) {
        setSelectedAgent(details);
        setLogScrollOffset(0);
      }
    }
  }, [viewLevel, agentIndex, dbService]);

  // Terminal dimensions - 直接使用真实值
  const termW = process.stdout.columns || 100;
  const termH = process.stdout.rows || 30;

  // 整个页面布局: header(1) + SEP(1) + content(N) + SEP(1) + statusBar(1) = N+4
  // 所以 content 可用行数 = termH - 4
  const contentMaxH = Math.max(5, termH - 4);

  useInput((input, key) => {
    if (input === 'q') {
      if (viewLevel === 'details') { setViewLevel('agents'); return; }
      if (viewLevel === 'agents') { setViewLevel('sessions'); setSelectedSession(null); return; }
      exit();
      return;
    }
    if (input === 'r') {
      if (dbService) { setSessions(dbService.getSessions(10)); setLastRefresh(new Date()); }
      return;
    }
    if (key.escape) {
      if (viewLevel === 'details') { setViewLevel('agents'); return; }
      if (viewLevel === 'agents') { setViewLevel('sessions'); setSelectedSession(null); return; }
      return;
    }
    if (key.return) {
      if (viewLevel === 'sessions' && sessions[sessionIndex]) {
        setSelectedSession(sessions[sessionIndex]);
        setViewLevel('agents');
        setAgentIndex(0);
      } else if (viewLevel === 'agents' && sessionAgents[agentIndex]) {
        setSelectedAgent(sessionAgents[agentIndex]);
        setViewLevel('details');
        setLogScrollOffset(0);
      }
      return;
    }
    if (key.upArrow || input === 'k') {
      if (viewLevel === 'sessions') setSessionIndex(p => Math.max(0, p - 1));
      else if (viewLevel === 'agents') setAgentIndex(p => Math.max(0, p - 1));
      else if (viewLevel === 'details') setLogScrollOffset(p => Math.max(0, p - 1));
      return;
    }
    if (key.downArrow || input === 'j') {
      if (viewLevel === 'sessions') setSessionIndex(p => Math.min(sessions.length - 1, p + 1));
      else if (viewLevel === 'agents') setAgentIndex(p => Math.min(sessionAgents.length - 1, p + 1));
      else if (viewLevel === 'details') setLogScrollOffset(p => p + 1);
      return;
    }
    if (viewLevel === 'details') {
      if (key.leftArrow || input === 'h') {
        const idx = Math.max(0, agentIndex - 1);
        setAgentIndex(idx);
        setSelectedAgent(sessionAgents[idx]);
      }
      if (key.rightArrow || input === 'l') {
        const idx = Math.min(sessionAgents.length - 1, agentIndex + 1);
        setAgentIndex(idx);
        setSelectedAgent(sessionAgents[idx]);
      }
      if (input === 'g') setLogScrollOffset(0);
      if (input === 'G') {
        const total = selectedAgent?.toolCalls?.length || 0;
        const logAreaH = Math.max(5, termH - 10);
        setLogScrollOffset(Math.max(0, total - logAreaH));
      }
      // Page up/down
      if (key.pageUp) setLogScrollOffset(p => Math.max(0, p - 10));
      if (key.pageDown) setLogScrollOffset(p => p + 10);
    }
  });

  // ─── Session List ─────────────────────────────────────────────────
  const renderSessions = () => {
    const running = sessions.filter(s => s.isRunning).length;
    const lines: string[] = [];
    lines.push(` 📋 会话列表 (${running} 运行中)`);
    lines.push(makeSep(termW));
    // 剩余行数给列表
    const listMaxH = contentMaxH - 2;
    const visible = sessions.slice(0, listMaxH);
    if (visible.length === 0) {
      lines.push('  暂无会话');
    } else {
      visible.forEach((s, i) => {
        const cursor = i === sessionIndex ? '▶' : ' ';
        const icon = s.isRunning ? '🟢' : '⚪';
        const title = truncate(s.title, 45);
        const agent = s.mainAgent;
        const dur = formatDuration(s.duration);
        lines.push(`${cursor}${icon} ${title}  │ ${agent} │ ${dur}`);
      });
    }
    return lines.join('\n');
  };

  // ─── Agent List ───────────────────────────────────────────────────
  const renderAgents = () => {
    const running = sessionAgents.filter(a => a.status === 'running').length;
    const lines: string[] = [];
    lines.push(` 🤖 Agents (${running} 运行中) │ ${truncate(selectedSession?.title || '', 40)}`);
    lines.push(makeSep(termW));
    const listMaxH = contentMaxH - 2;
    const visible = sessionAgents.slice(0, listMaxH);
    if (visible.length === 0) {
      lines.push('  暂无 Agent');
    } else {
      visible.forEach((a, i) => {
        const cursor = i === agentIndex ? '▶' : ' ';
        const icon = getStatusIcon(a.status);
        const name = truncate(a.name, 20).padEnd(20);
        const task = truncate(a.task, 35);
        const dur = formatDuration(a.duration);
        lines.push(`${cursor}${icon} ${name} │ ${task} │ ${dur}`);
      });
    }
    return lines.join('\n');
  };

  // ─── Agent Details ────────────────────────────────────────────────
  const renderDetails = () => {
    if (!selectedAgent) return '  选择一个 Agent';

    const logs = selectedAgent.toolCalls || [];
    // 固定行: info(1) + task(1) + tabs(1或0) + SEP(1) + logHeader(1) = 4~5行
    const fixedHeaderLines = sessionAgents.length > 1 ? 5 : 4;
    // 日志区域 = contentMaxH - 固定行，最多 25 行
    const logAreaH = Math.min(25, Math.max(3, contentMaxH - fixedHeaderLines));
    const totalLogs = logs.length;
    const maxOffset = Math.max(0, totalLogs - logAreaH);
    const offset = Math.min(logScrollOffset, maxOffset);
    const visibleLogs = logs.slice(offset, offset + logAreaH);

    const lines: string[] = [];

    // Info line 1
    const model = selectedAgent.model;
    const dur = formatDuration(selectedAgent.duration);
    const tokIn = formatNumber(selectedAgent.tokens.input);
    const tokOut = formatNumber(selectedAgent.tokens.output);
    lines.push(` 📊 ${selectedAgent.name} │ ${model} │ ${dur} │ ${tokIn}/${tokOut} tokens`);

    // Info line 2
    lines.push(` Task: ${truncate(selectedAgent.task, 68)}`);

    // Agent tabs
    if (sessionAgents.length > 1) {
      const tabs = sessionAgents.map((a, i) => {
        const n = truncate(a.name, 12);
        return i === agentIndex ? `[${n}]` : ` ${n} `;
      }).join(' ');
      lines.push(` Agents: ${tabs}`);
    }

    lines.push(makeSep(termW));

    // Log header
    let logHeader = ` 📋 活动日志 ${totalLogs} 条`;
    if (totalLogs > logAreaH) {
      logHeader += ` (${offset + 1}-${Math.min(offset + logAreaH, totalLogs)}/${totalLogs})`;
    }
    logHeader += ` │ ←→切换 ↑↓滚动`;
    lines.push(logHeader);

    // Log lines - 固定宽度，不换行
    const infoWidth = termW - 22;
    if (visibleLogs.length === 0) {
      lines.push('  暂无日志');
    } else {
      visibleLogs.forEach((call, i) => {
        const idx = offset + i + 1;
        const num = String(idx).padStart(3);
        const time = formatTimestamp(call.time);
        const icon = call.status === 'completed' ? '✅' : '❌';
        const tool = call.tool.padEnd(8).substring(0, 8);
        const info = call.info.replace(/\n/g, ' ').replace(/\s+/g, ' ').substring(0, infoWidth);
        lines.push(` ${num} ${time} ${icon} ${tool}  ${info}`);
      });
    }

    return lines.join('\n');
  };

  // ─── Breadcrumb ───────────────────────────────────────────────────
  const breadcrumb = () => {
    const parts = ['omo-monitor'];
    if (selectedSession) parts.push(truncate(selectedSession.title, 30));
    if (viewLevel === 'details' && selectedAgent) parts.push(selectedAgent.name);
    return parts.join(' > ');
  };

  // ─── Status Bar ───────────────────────────────────────────────────
  const statusBar = () => {
    const left = viewLevel === 'sessions'
      ? '[q]退出 [↑↓]选择 [Enter]进入 [r]刷新'
      : viewLevel === 'agents'
        ? '[q]返回 [↑↓]选择 [Enter]详情 [r]刷新'
        : '[q]返回 [←→]切换Agent [↑↓]滚动 [PageUp/Down]翻页 [g/G]首末 [r]刷新';
    const right = viewLevel === 'sessions'
      ? `${sessions.length} sessions`
      : viewLevel === 'agents'
        ? `${sessionAgents.length} agents`
        : `${selectedAgent?.toolCalls?.length || 0} activities`;
    const padding = Math.max(1, termW - left.length - right.length - 2);
    return `${left}${' '.repeat(padding)}${right}`;
  };

  // ─── Main Render ──────────────────────────────────────────────────
  const header = ` 🔍 ${breadcrumb()} │ ${formatTimestamp(lastRefresh)}`;

  let content = '';
  if (viewLevel === 'sessions') content = renderSessions();
  else if (viewLevel === 'agents') content = renderAgents();
  else content = renderDetails();

  // 不填充空行，状态栏紧跟内容
  return (
    <Box flexDirection="column" width={termW}>
      <Text bold color="cyan">{header}</Text>
      <Text dimColor>{makeSep(termW)}</Text>
      <Text>{content}</Text>
      <Text dimColor>{makeSep(termW)}</Text>
      <Text dimColor>{statusBar()}</Text>
    </Box>
  );
};
