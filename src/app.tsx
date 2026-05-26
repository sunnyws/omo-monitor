/**
 * Main Application Component v2.0
 * 
 * 核心修复：
 * 1. 使用 displayWidth 处理 ANSI/中文/emoji 对齐
 * 2. 直接使用 ToolCall 预解析字段，不重复 parseActivity
 * 3. 先 padEnd 再 wrap ANSI，保证列对齐
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { DatabaseService, Session } from './services/database.js';
import { ConfigManager } from './services/config.js';
import { Agent, ToolCall } from './types/agent.js';
import { formatDuration, formatNumber, formatCost } from './utils/format.js';
import { sep } from 'path';

// ─────────────────────────────────────────
//  Props & Types
// ─────────────────────────────────────────
interface AppProps {
  config: ConfigManager;
  dbService: DatabaseService;
  initialSessions: Session[];
}

type ViewLevel = 'sessions' | 'agents' | 'details';

// ─────────────────────────────────────────
//  ANSI codes
// ─────────────────────────────────────────
const A = {
  reset: '\x1b[0m',
  bold:  '\x1b[1m',
  dim:   '\x1b[2m',
  rev:   '\x1b[7m',
  red:   '\x1b[31m',
  green: '\x1b[32m',
  yellow:'\x1b[33m',
  blue:  '\x1b[34m',
  magenta:'\x1b[35m',
  cyan:  '\x1b[36m',
  white: '\x1b[37m',
  gray:  '\x1b[90m',
} as const;

// ─────────────────────────────────────────
//  Display-width helpers (core fix)
// ─────────────────────────────────────────

/** 判断字符是否为宽字符(CJK + 常见emoji范围) */
function isWideChar(ch: string): boolean {
  const c = ch.codePointAt(0)!;
  return (
    (c >= 0x1100 && c <= 0x115f) ||
    (c >= 0x2e80 && c <= 0x303e) ||
    (c >= 0x3040 && c <= 0x33bf) ||
    (c >= 0x3400 && c <= 0x4dbf) ||
    (c >= 0x4e00 && c <= 0xa4cf) ||
    (c >= 0xac00 && c <= 0xd7a3) ||
    (c >= 0xf900 && c <= 0xfaff) ||
    (c >= 0xfe10 && c <= 0xfe6f) ||
    (c >= 0xff01 && c <= 0xff60) ||
    (c >= 0xffe0 && c <= 0xffe6) ||
    (c >= 0x1f000 && c <= 0x1faff) ||
    (c >= 0x20000 && c <= 0x2fa1f)
  );
}

/** 判断字符是否为 ANSI 转义序列的一部分 */
function isAnsiStart(ch: number): boolean {
  return ch === 0x1b; // ESC
}

/**
 * 计算字符串的终端显示宽度
 * - 跳过 ANSI 转义序列
 * - CJK/emoji 字符算 2 列
 */
function displayWidth(s: string): number {
  let w = 0;
  let i = 0;
  while (i < s.length) {
    const code = s.charCodeAt(i);
    // 跳过 ANSI 转义序列 ESC[...m
    if (isAnsiStart(code)) {
      while (i < s.length && s[i] !== 'm') i++;
      i++; // skip 'm'
      continue;
    }
    w += isWideChar(s[i]) ? 2 : 1;
    i++;
  }
  return w;
}

/**
 * 将字符串填充到目标显示宽度
 * - 在字符串右侧填充空格，使 displayWidth 达到 target
 * - 如果已经超出则截断并加 ~
 */
function padEndDisplay(s: string, target: number): string {
  const cur = displayWidth(s);
  if (cur > target) {
    // 需要截断 — 逐字符截断到 target-1 再加 ~
    let result = '';
    let w = 0;
    let i = 0;
    while (i < s.length) {
      const code = s.charCodeAt(i);
      // ANSI 转义序列：整段加入，不计入宽度
      if (isAnsiStart(code)) {
        let seq = '';
        while (i < s.length) {
          seq += s[i];
          if (s[i] === 'm') { i++; break; }
          i++;
        }
        result += seq;
        continue;
      }
      const cw = isWideChar(s[i]) ? 2 : 1;
      if (w + cw >= target) break;
      result += s[i];
      w += cw;
      i++;
    }
    const trunc = result + '~';
    return trunc + ' '.repeat(Math.max(0, target - displayWidth(trunc)));
  }
  return s + ' '.repeat(target - cur);
}

function padStartDisplay(s: string, target: number): string {
  const cur = displayWidth(s);
  if (cur >= target) return padEndDisplay(s, target);
  return ' '.repeat(target - cur) + s;
}

/**
 * 裁剪到最大显示宽度（不含 ANSI）
 */
function truncDisplay(s: string, max: number): string {
  let w = 0;
  let result = '';
  for (const ch of s) {
    const cw = isWideChar(ch) ? 2 : 1;
    if (w + cw > max - 3) { result += '...'; break; }
    result += ch;
    w += cw;
  }
  return result;
}

// 便捷着色：先 pad 再 wrap ANSI
const cBold  = (s: string) => `${A.bold}${s}${A.reset}`;
const cColor = (s: string, c: string) => `${c}${s}${A.reset}`;

// ─────────────────────────────────────────
//  Column definitions
// ─────────────────────────────────────────
// 会话列表
const S = {
  idx:    4,
  title:  24,
  agent:  14,
  model:  14,
  tokens: 8,
  status: 6,
  time:   8,
};
// Agent 列表
const AG = {
  idx:    4,
  agent:  14,
  model:  14,
  tokens: 8,
  dur:    8,
  time:   8,
};

const GAP = ' '; // 列间间隔

// 表格行构建：每列之间自动插入 1 字符间隔
type ColSpec = { text: string; width: number; align: 'left' | 'right' };

function buildRow(cols: ColSpec[]): string {
  return cols.map((c, i) => {
    const padded = c.align === 'right'
      ? padStartDisplay(c.text, c.width)
      : padEndDisplay(c.text, c.width);
    // 最后一列不加间隔
    return i < cols.length - 1 ? padded + GAP : padded;
  }).join('');
}
// 日志
const LG = {
  num:   0, // 动态
  time:  8,
  tool:  14,
  info:  0, // 动态
};

const makeSep = (w: number) => '─'.repeat(Math.max(1, w));

// ─────────────────────────────────────────
//  工具类型 → 图标+颜色 映射
// ─────────────────────────────────────────
interface ToolDisplay { icon: string; color: string; label: string }

function getToolDisplay(tool: string): ToolDisplay {
  if (!tool) return { icon: '?', color: A.gray, label: '未知' };
  const t = tool.toLowerCase();

  if (t === 'bash')                    return { icon: '$', color: A.red, label: '终端' };
  if (t === 'read')                    return { icon: 'R', color: A.blue, label: '读取' };
  if (t === 'write')                   return { icon: 'W', color: A.green, label: '写入' };
  if (t === 'edit')                    return { icon: 'E', color: A.green, label: '编辑' };
  if (t === 'grep')                    return { icon: 'G', color: A.yellow, label: '搜索' };
  if (t === 'ast_grep_search')         return { icon: 'A', color: A.yellow, label: 'AST搜索' };
  if (t === 'glob')                    return { icon: 'L', color: A.cyan, label: '列举' };
  if (t === 'lsp_diagnostics')         return { icon: 'D', color: A.cyan, label: '诊断' };
  if (t === 'todowrite')               return { icon: 'T', color: A.cyan, label: '待办' };
  if (t === 'task')                    return { icon: 'K', color: A.magenta, label: '子任务' };
  if (t === 'call_omo_agent')          return { icon: 'C', color: A.magenta, label: 'Agent协作' };
  if (t === 'background_output')       return { icon: 'O', color: A.magenta, label: '后台输出' };
  if (t === 'background_cancel')       return { icon: 'X', color: A.magenta, label: '后台取消' };
  if (t === 'question')                return { icon: '?', color: A.white, label: '提问' };
  if (t === 'browser')                 return { icon: 'B', color: A.magenta, label: '浏览器' };
  // 消息类型 (数据库英文名)
  if (t === 'model')                   return { icon: 'M', color: A.magenta, label: '模型调用' };
  if (t === 'reasoning')               return { icon: 'Q', color: A.yellow, label: '推理' };
  if (t === 'output')                  return { icon: 'O', color: A.white, label: '输出' };
  if (t === 'step')                    return { icon: '-', color: A.gray, label: '步骤' };
  if (t === 'system')                  return { icon: 'S', color: A.gray, label: '系统' };

  return { icon: '?', color: A.gray, label: truncDisplay(tool, 12) };
}

// ─────────────────────────────────────────
//  Main App
// ─────────────────────────────────────────
export const App: React.FC<AppProps> = ({ config, dbService, initialSessions }) => {
  const { exit } = useApp();
  
  const sessionsRef = useRef<Session[]>(initialSessions);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionAgents, setSessionAgents] = useState<Agent[]>([]);
  const [agentIndex, setAgentIndex] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [viewLevel, setViewLevel] = useState<ViewLevel>('sessions');
  const [sessionIndex, setSessionIndex] = useState(0);
  const [logScrollOffset, setLogScrollOffset] = useState(0);
  const [, setRefreshKey] = useState(0);

  // Load session agents
  useEffect(() => {
    if (selectedSession && dbService) {
      const agents = dbService.getSessionAgents(selectedSession.id);
      setSessionAgents(agents);
    }
  }, [selectedSession, dbService]);

  // Load agent details
  useEffect(() => {
    if (viewLevel === 'details' && sessionAgents.length > 0 && agentIndex < sessionAgents.length) {
      const agent = sessionAgents[agentIndex];
      if (dbService && agent.id) {
        const agentDetails = dbService.getAgentDetails(agent.id);
        setSelectedAgent(agentDetails || agent);
      } else {
        setSelectedAgent(agent);
      }
    }
  }, [agentIndex, sessionAgents, dbService, viewLevel]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (dbService) {
        sessionsRef.current = dbService.getSessions(10);
        setRefreshKey(k => k + 1);
      }
    }, config.getConfig().refresh.interval);
    return () => clearInterval(interval);
  }, [dbService, config.getConfig().refresh.interval]);

  // Keyboard
  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) exit();

    const sessions = sessionsRef.current;

    if (viewLevel === 'sessions') {
      if (key.upArrow) setSessionIndex(Math.max(0, sessionIndex - 1));
      else if (key.downArrow) setSessionIndex(Math.min(sessions.length - 1, sessionIndex + 1));
      else if (key.return && sessions[sessionIndex]) {
        setSelectedSession(sessions[sessionIndex]);
        setViewLevel('agents');
        setAgentIndex(0);
      }
    } else if (viewLevel === 'agents') {
      if (key.upArrow) setAgentIndex(Math.max(0, agentIndex - 1));
      else if (key.downArrow) setAgentIndex(Math.min(sessionAgents.length - 1, agentIndex + 1));
      else if (key.return && sessionAgents[agentIndex]) {
        setViewLevel('details');
        setLogScrollOffset(0);
      }
      else if (key.escape) {
        setViewLevel('sessions');
        setSelectedSession(null);
        setSessionAgents([]);
      }
    } else if (viewLevel === 'details') {
      const logLen = selectedAgent?.toolCalls?.length || 0;
      if (key.upArrow) setLogScrollOffset(Math.max(0, logScrollOffset - 1));
      else if (key.downArrow) setLogScrollOffset(Math.min(Math.max(0, logLen - 1), logScrollOffset + 1));
      else if (key.leftArrow && agentIndex > 0) { setAgentIndex(agentIndex - 1); setLogScrollOffset(0); }
      else if (key.rightArrow && agentIndex < sessionAgents.length - 1) { setAgentIndex(agentIndex + 1); setLogScrollOffset(0); }
      else if (key.escape) { setViewLevel('agents'); setSelectedAgent(null); }
      else if (input === 'g') setLogScrollOffset(0);
      else if (input === 'G') setLogScrollOffset(Math.max(0, logLen - 1));
    }
  });

  // ─── 终端尺寸 ───
  const W = process.stdout.columns || 90;
  const H = process.stdout.rows || 35;
  const contentH = H - 5; // header(1) + sep(1) + content + sep(1) + status(1) + 余量

  const out: string[] = [];
  const sessions = sessionsRef.current;

  // ── Header ──
  out.push(cBold('  Agent Monitor v2.0'));
  out.push(makeSep(W));

  // ═══════════════════════════════════════
  //  SESSIONS
  // ═══════════════════════════════════════
  if (viewLevel === 'sessions') {
    out.push(`  Sessions  ${A.gray}(↑↓:navigate  Enter:open  q:quit)${A.reset}`);
    out.push(makeSep(W));

    // 表头
    const hdr = buildRow([
      { text: '#', width: S.idx, align: 'left' },
      { text: 'Title', width: S.title, align: 'left' },
      { text: 'Agent', width: S.agent, align: 'left' },
      { text: 'Model', width: S.model, align: 'left' },
      { text: 'Tokens', width: S.tokens, align: 'right' },
      { text: 'Status', width: S.status, align: 'left' },
      { text: 'Time', width: S.time, align: 'right' },
    ]);
    out.push('  ' + cBold(hdr));
    out.push(makeSep(W));

    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      const sel = i === sessionIndex;
      const status = s.isRunning ? 'RUN' : '---';

      const row = buildRow([
        { text: String(i + 1), width: S.idx, align: 'left' },
        { text: truncDisplay(s.title || 'N/A', S.title), width: S.title, align: 'left' },
        { text: truncDisplay(s.mainAgent || '-', S.agent), width: S.agent, align: 'left' },
        { text: truncDisplay(s.model || '-', S.model), width: S.model, align: 'left' },
        { text: formatNumber(s.tokens.input + s.tokens.output), width: S.tokens, align: 'right' },
        { text: status, width: S.status, align: 'left' },
        { text: fmtTime(s.lastActivity), width: S.time, align: 'right' },
      ]);

      if (sel) {
        out.push(`${A.rev} >${row}${A.reset}`);
      } else {
        out.push(`  ${row}`);
      }
    }

    for (let i = sessions.length + 5; i < contentH; i++) out.push('');

  // ═══════════════════════════════════════
  //  AGENTS
  // ═══════════════════════════════════════
  } else if (viewLevel === 'agents') {
    const sName = truncDisplay(selectedSession?.title || 'N/A', 40);
    out.push(`  ${sName}  ${A.gray}(↑↓:select  Enter:details  Esc:back)${A.reset}`);
    out.push(makeSep(W));

    const hdr = buildRow([
      { text: '#', width: AG.idx, align: 'left' },
      { text: 'Agent', width: AG.agent, align: 'left' },
      { text: 'Model', width: AG.model, align: 'left' },
      { text: 'Tokens', width: AG.tokens, align: 'right' },
      { text: 'Duration', width: AG.dur, align: 'right' },
      { text: 'Time', width: AG.time, align: 'right' },
    ]);
    out.push('  ' + cBold(hdr));
    out.push(makeSep(W));

    for (let i = 0; i < sessionAgents.length; i++) {
      const a = sessionAgents[i];
      const sel = i === agentIndex;
      const dur = a.totalDuration ? formatDuration(a.totalDuration) : '-';

      const row = buildRow([
        { text: String(i + 1), width: AG.idx, align: 'left' },
        { text: truncDisplay(a.name || 'N/A', AG.agent), width: AG.agent, align: 'left' },
        { text: truncDisplay(a.model || '-', AG.model), width: AG.model, align: 'left' },
        { text: formatNumber((a.tokens?.input || 0) + (a.tokens?.output || 0)), width: AG.tokens, align: 'right' },
        { text: dur, width: AG.dur, align: 'right' },
        { text: fmtTime(a.lastActivity), width: AG.time, align: 'right' },
      ]);

      if (sel) {
        out.push(`${A.rev} >${row}${A.reset}`);
      } else {
        out.push(`  ${row}`);
      }
    }

    for (let i = sessionAgents.length + 5; i < contentH; i++) out.push('');

  // ═══════════════════════════════════════
  //  DETAILS
  // ═══════════════════════════════════════
  } else if (viewLevel === 'details') {
    // Agent tabs
    const tabs = sessionAgents.map((a, i) => {
      const name = a.name || `#${i + 1}`;
      return i === agentIndex ? cColor(`[${name}]`, A.bold + A.cyan) : ` ${name} `;
    }).join(' | ');
    out.push('  ' + tabs);
    out.push(makeSep(W));

    // Summary
    const a = selectedAgent;
    const dur  = a?.totalDuration ? formatDuration(a.totalDuration) : '-';
    const cost = a?.tokens?.cost ? formatCost(a.tokens.cost) : '-';
    const tin  = formatNumber(a?.tokens?.input || 0);
    const tout = formatNumber(a?.tokens?.output || 0);
    out.push(`  ${cBold(a?.name || 'N/A')}  |  Dur: ${dur}  |  Tokens: ${tin}=>${tout}<=  |  Cost: ${cost}`);
    out.push(makeSep(W));

    // Log area
    out.push(cBold('  Activity Log') + `  ${A.gray}(↑↓:scroll  ←→:switch  g/G:top/bottom  Esc:back)${A.reset}`);
    out.push(makeSep(W));

    const logs = a?.toolCalls || [];
    const totalLogs = logs.length;
    const numW = Math.max(2, String(totalLogs).length);
    const infoW = Math.max(10, W - numW - 3 - LG.time - 2 - LG.tool - 2 - 4);

    // Log header
    const logHdr =
      padStartDisplay('#', numW) + '  ' +
      padEndDisplay('Time', LG.time) + '  ' +
      padEndDisplay('Tool', LG.tool) + '  ' +
      'Info';
    out.push('  ' + cColor(logHdr, A.bold));

    // Log body
    const fixedAbove = 2 + 2 + 1 + 1; // header(1)+sep(1)+tabs line+sep+summary+sep+log title+sep+log hdr
    const logAreaH = Math.min(25, Math.max(3, contentH - fixedAbove));
    const visible = logs.slice(logScrollOffset, logScrollOffset + logAreaH);

    for (let i = 0; i < logAreaH; i++) {
      if (i < visible.length) {
        const log = visible[i];
        const lineNum = logScrollOffset + i + 1;
        const td = getToolDisplay(log.tool);

        // 纯文本先 pad
        const numCol  = padStartDisplay(String(lineNum), numW);
        const timeCol = padEndDisplay(fmtTime(log.time), LG.time);
        const toolCol = padEndDisplay(truncDisplay(td.label, LG.tool), LG.tool);
        const infoCol = truncDisplay(log.info || '-', infoW);

        // 再 wrap ANSI
        const numS  = cColor(numCol, A.gray);
        const timeS = cColor(timeCol, A.gray);
        const toolS = cColor(toolCol, td.color);
        const infoS = cColor(infoCol, td.color);

        out.push(`  ${numS}  ${timeS}  ${toolS}  ${infoS}`);
      } else {
        out.push('');
      }
    }
  }

  // ── Status bar ──
  out.push(makeSep(W));
  const viewLabel = viewLevel === 'sessions' ? 'Sessions' : viewLevel === 'agents' ? 'Agents' : 'Details';
  const now = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  out.push(`  ${A.gray}[${viewLabel}] ${sessions.length} sessions | ${sessionAgents.length} agents | ${now} | q:quit${A.reset}`);

  return (
    <Box flexDirection="column" width={W}>
      {out.map((line, i) => <Text key={i}>{line}</Text>)}
    </Box>
  );
};

// ─── 本地时间格式化 ───
function fmtTime(d: Date | string | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
