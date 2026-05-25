# omo-monitor 技术设计文档

> OpenCode + omo Agent 终端监控工具

---

## 一、项目概述

### 1.1 项目简介

**omo-monitor** 是一个终端 TUI 监控工具，用于实时查看 OpenCode 和 oh-my-openagent 的运行状态，包括 Agent 列表、工具调用、文件操作、Token 统计等。

### 1.2 核心特性

- 🤖 实时显示 Agent 运行状态
- 📊 Token 使用量和成本统计
- 📁 文件操作追踪
- 🔧 工具调用日志
- ⌨️ 键盘 + 鼠标双模式支持
- 🎨 可配置主题和刷新频率
- 📦 npm 全局安装，开箱即用

### 1.3 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| TypeScript | 5.x | 类型安全 |
| Ink | 4.x | 终端 UI 框架 |
| React | 18.x | 组件模型 |
| better-sqlite3 | 9.x | SQLite 数据库读取 |
| Commander | 11.x | CLI 参数解析 |
| Chalk | 5.x | 终端颜色 |

---

## 二、系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      omo-monitor CLI                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Agent     │  │   Detail    │  │    Log      │              │
│  │   Panel     │  │   Panel     │  │   Panel     │              │
│  │  (列表)     │  │  (详情)     │  │  (日志)     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│         ↑                ↑                ↑                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Data Layer (数据层)                       ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         ││
│  │  │  SQLite     │  │  Config     │  │  State      │         ││
│  │  │  Reader     │  │  Manager    │  │  Manager    │         ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
         ↓                                    ↓
┌─────────────────────┐              ┌─────────────────────┐
│  ~/.local/share/    │              │  ~/.config/         │
│  opencode/opencode  │              │  omo-monitor/       │
│  .db                │              │  config.json        │
└─────────────────────┘              └─────────────────────┘
```

### 2.2 数据流

```
SQLite DB ──轮询(2s)──→ Data Layer ──更新──→ React State ──渲染──→ 终端 UI
                              ↓
                        解析 & 聚合
                              ↓
                     Agent / Tool / File / Token
```

---

## 三、项目结构

```
omo-monitor/
├── src/
│   ├── index.tsx              # 入口文件
│   ├── cli.ts                 # CLI 参数处理
│   ├── app.tsx                # 主应用组件
│   │
│   ├── components/            # UI 组件
│   │   ├── Header.tsx         # 顶部状态栏
│   │   ├── AgentPanel.tsx     # Agent 列表面板
│   │   ├── AgentItem.tsx      # 单个 Agent 项
│   │   ├── DetailPanel.tsx    # 详情面板
│   │   ├── LogPanel.tsx       # 日志面板
│   │   ├── StatusBar.tsx      # 底部状态栏
│   │   ├── TokenStats.tsx     # Token 统计
│   │   └── FileStats.tsx      # 文件操作统计
│   │
│   ├── hooks/                 # 自定义 Hooks
│   │   ├── useDatabase.ts     # 数据库读取
│   │   ├── useAgents.ts       # Agent 数据
│   │   ├── useLogs.ts         # 日志数据
│   │   ├── useConfig.ts       # 配置管理
│   │   └── useKeyboard.ts     # 键盘事件
│   │
│   ├── services/              # 业务逻辑
│   │   ├── database.ts        # SQLite 操作
│   │   ├── agent-parser.ts    # Agent 数据解析
│   │   ├── log-parser.ts      # 日志解析
│   │   └── token-calculator.ts # Token 统计
│   │
│   ├── types/                 # 类型定义
│   │   ├── agent.ts           # Agent 相关类型
│   │   ├── log.ts             # 日志相关类型
│   │   ├── config.ts          # 配置类型
│   │   └── database.ts        # 数据库类型
│   │
│   └── utils/                 # 工具函数
│       ├── format.ts          # 格式化工具
│       ├── color.ts           # 颜色工具
│       └── path.ts            # 路径工具
│
├── config/
│   └── default.json           # 默认配置
│
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

---

## 四、数据模型

### 4.1 Agent 状态

```typescript
// types/agent.ts

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
```

### 4.2 配置模型

```typescript
// types/config.ts

export interface Config {
  // 刷新设置
  refresh: {
    interval: number;            // 刷新间隔 (ms), 默认 2000
    autoRefresh: boolean;        // 是否自动刷新
  };
  
  // 显示设置
  display: {
    theme: 'dark' | 'light';    // 主题
    showTimestamp: boolean;      // 显示时间戳
    maxLogLines: number;         // 最大日志行数, 默认 100
    dateFormat: string;          // 日期格式
  };
  
  // 快捷键设置
  keybindings: {
    quit: string;                // 退出, 默认 'q'
    refresh: string;             // 刷新, 默认 'r'
    selectNext: string;          // 下一个, 默认 'j' 或 ↓
    selectPrev: string;          // 上一个, 默认 'k' 或 ↑
    details: string;             // 查看详情, 默认 'Enter'
    search: string;              // 搜索, 默认 '/'
  };
  
  // 数据库路径
  database: {
    path: string;                // SQLite 数据库路径
  };
  
  // 日志设置
  logs: {
    maxEntries: number;          // 最大日志条数
    showToolInput: boolean;      // 显示工具输入
    showToolOutput: boolean;     // 显示工具输出
  };
}
```

---

## 五、UI 设计

### 5.1 整体布局

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔍 omo-monitor                               v1.0.0  [2s] auto   │
│  主会话: Sisyphus | Model: mimo-v2.5-pro | 🟢 Running              │
├────────────────────────────────┬────────────────────────────────────┤
│  📋 Agent 列表 (3 running)     │  📊 详情 - Sisyphus-Junior        │
│  ────────────────────────────  │  ──────────────────────────────── │
│  ▶ 🟢 Sisyphus-Junior         │  Agent: Sisyphus-Junior           │
│      实现邀请函推送逻辑         │  Model: xiaomi-token-plan-sgp/    │
│      ⏱ 15m 32s                │        mimo-v2.5-pro              │
│                                │  Task: 实现邀请函推送逻辑          │
│    🟢 Explore                  │  Duration: 15m 32s                │
│      查找枚举文件              │                                   │
│      ⏱ 2m 10s                 │  ┌─ 🔧 工具调用 (最近 5) ────────┐ │
│                                │  │ 16:14:45 ✅ edit JkPublic... │ │
│    🟢 Oracle                   │  │ 16:15:16 ✅ edit JkPublic... │ │
│      代码审查                  │  │ 16:21:18 ✅ bash mvn clean.. │ │
│      ⏱ 5m 45s                 │  │ 16:25:09 ✅ grep appendInvi.. │ │
│                                │  │ 16:25:28 ✅ todowrite 5 tas..│ │
│    ⚪ Prometheus (idle)        │  └──────────────────────────────┘ │
│                                │                                   │
│    ⚪ Atlas (idle)             │  ┌─ 📁 文件操作 ─────────────────┐ │
│                                │  │ JkPublicResourcePushZmq...   │ │
│                                │  │   读: 7 | 写: 11             │ │
│                                │  │ PurchaseFileZcyCommonPush... │ │
│                                │  │   读: 2 | 写: 0              │ │
│                                │  └──────────────────────────────┘ │
│                                │                                   │
│                                │  ┌─ 📊 Token 统计 ───────────────┐ │
│                                │  │ Input:    136,150             │ │
│                                │  │ Output:    10,452             │ │
│                                │  │ Reasoning:  5,660             │ │
│                                │  │ Cost:       $0.00             │ │
│                                │  └──────────────────────────────┘ │
├────────────────────────────────┴────────────────────────────────────┤
│  📜 实时日志                                                        │
│  ──────────────────────────────────────────────────────────────── │
│  [16:21:18] ✅ bash: mvn clean compile -pl poseidon-service        │
│  [16:21:59] ✅ bash: which mvn 2>/dev/null || ...                   │
│  [16:22:25] ✅ bash: ls -la /Users/zcy/workspace/poseidon/...      │
│  [16:25:09] ✅ grep: appendInvitationLetter                        │
│  [16:25:28] ✅ todowrite: 5 tasks updated                          │
│  [16:25:55] ✅ bash: mkdir -p /Users/zcy/workspace/poseidon/.omo/..│
│  [16:26:39] ✅ background_output: Task bg_a1c94ede completed       │
└─────────────────────────────────────────────────────────────────────┘
│  [q]退出 [↑↓]选择 [Enter]详情 [r]刷新 [/]搜索 [Tab]切换面板         │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 状态指示器

| 状态 | 图标 | 颜色 |
|------|------|------|
| Running | 🟢 | green |
| Idle | ⚪ | gray |
| Completed | ✅ | green |
| Error | ❌ | red |
| Warning | ⚠️ | yellow |

### 5.3 颜色主题

```typescript
// Dark Theme (默认)
const darkTheme = {
  primary: '#00D4FF',      // 主色调
  success: '#00FF88',      // 成功/运行中
  error: '#FF4444',        // 错误
  warning: '#FFAA00',      // 警告
  muted: '#666666',        // 次要信息
  background: '#1A1A2E',   // 背景（终端背景色）
  text: '#FFFFFF',         // 文本
  highlight: '#333355',    // 高亮背景
};

// Light Theme
const lightTheme = {
  primary: '#0066CC',
  success: '#008800',
  error: '#CC0000',
  warning: '#CC8800',
  muted: '#999999',
  background: '#FFFFFF',
  text: '#000000',
  highlight: '#EEEEEE',
};
```

---

## 六、核心模块设计

### 6.1 数据库读取模块

```typescript
// services/database.ts

import Database from 'better-sqlite3';

export class DatabaseService {
  private db: Database.Database;
  
  constructor(dbPath: string) {
    this.db = new Database(dbPath, { readonly: true });
  }
  
  // 获取活跃的 Agent 列表
  getActiveAgents(): Agent[] {
    const sessions = this.db.prepare(`
      SELECT id, agent, model, title, time_created,
             tokens_input, tokens_output, tokens_reasoning, cost
      FROM session
      WHERE time_archived IS NULL
      ORDER BY time_created DESC
    `).all();
    
    return sessions.map(this.parseSession);
  }
  
  // 获取指定 Agent 的工具调用
  getToolCalls(sessionId: string, limit = 50): ToolCall[] {
    const parts = this.db.prepare(`
      SELECT time_created, data
      FROM part
      WHERE session_id = ? AND json_extract(data, '$.type') = 'tool'
      ORDER BY time_created ASC
      LIMIT ?
    `).all(sessionId, limit);
    
    return parts.map(this.parseToolCall);
  }
  
  // 获取文件操作统计
  getFileOperations(sessionId: string): FileOperation[] {
    const parts = this.db.prepare(`
      SELECT data
      FROM part
      WHERE session_id = ? AND json_extract(data, '$.type') = 'tool'
    `).all(sessionId);
    
    return this.aggregateFileOps(parts);
  }
  
  // 解析 Session 为 Agent
  private parseSession(row: any): Agent {
    const modelData = JSON.parse(row.model || '{}');
    return {
      id: row.id,
      name: row.agent || 'unknown',
      status: this.determineStatus(row),
      task: row.title || 'N/A',
      model: modelData.id || 'unknown',
      provider: modelData.providerID || 'unknown',
      startTime: new Date(row.time_created),
      duration: Date.now() - row.time_created,
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
}
```

### 6.2 Agent 数据 Hook

```typescript
// hooks/useAgents.ts

import { useState, useEffect, useCallback } from 'react';
import { DatabaseService } from '../services/database';
import { Agent } from '../types/agent';

export function useAgents(db: DatabaseService, refreshInterval: number) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const refresh = useCallback(() => {
    const activeAgents = db.getActiveAgents();
    setAgents(activeAgents);
    setLoading(false);
  }, [db]);
  
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refresh, refreshInterval]);
  
  const selectNext = useCallback(() => {
    setSelectedIndex(prev => Math.min(prev + 1, agents.length - 1));
  }, [agents.length]);
  
  const selectPrev = useCallback(() => {
    setSelectedIndex(prev => Math.max(prev - 1, 0));
  }, []);
  
  return {
    agents,
    selectedAgent: agents[selectedIndex],
    selectedIndex,
    selectNext,
    selectPrev,
    refresh,
    loading,
  };
}
```

### 6.3 日志 Hook

```typescript
// hooks/useLogs.ts

import { useState, useEffect, useRef } from 'react';
import { DatabaseService } from '../services/database';
import { ToolCall } from '../types/agent';

export function useLogs(db: DatabaseService, sessionId: string | null) {
  const [logs, setLogs] = useState<ToolCall[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!sessionId) {
      setLogs([]);
      return;
    }
    
    const refreshLogs = () => {
      const toolCalls = db.getToolCalls(sessionId, 100);
      setLogs(toolCalls);
    };
    
    refreshLogs();
    const interval = setInterval(refreshLogs, 1000); // 日志刷新更快
    
    return () => clearInterval(interval);
  }, [db, sessionId]);
  
  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);
  
  return { logs, autoScroll, setAutoScroll, logRef };
}
```

---

## 七、CLI 命令设计

### 7.1 基本用法

```bash
# 启动监控（默认配置）
omo-monitor

# 指定刷新间隔
omo-monitor --refresh 3

# 指定主题
omo-monitor --theme light

# 指定数据库路径
omo-monitor --db /path/to/opencode.db

# 查看帮助
omo-monitor --help

# 查看版本
omo-monitor --version
```

### 7.2 CLI 参数

```typescript
// cli.ts

import { Command } from 'commander';

const program = new Command();

program
  .name('omo-monitor')
  .description('OpenCode + omo Agent 终端监控工具')
  .version('1.0.0')
  .option('-r, --refresh <seconds>', '刷新间隔（秒）', '2')
  .option('-t, --theme <theme>', '主题 (dark/light)', 'dark')
  .option('--db <path>', 'SQLite 数据库路径')
  .option('--no-mouse', '禁用鼠标支持')
  .option('--debug', '启用调试模式')
  .action(startMonitor);

program.parse();
```

---

## 八、配置文件设计

### 8.1 默认配置

```json
// config/default.json
{
  "refresh": {
    "interval": 2000,
    "autoRefresh": true
  },
  "display": {
    "theme": "dark",
    "showTimestamp": true,
    "maxLogLines": 100,
    "dateFormat": "HH:mm:ss"
  },
  "keybindings": {
    "quit": "q",
    "refresh": "r",
    "selectNext": "j",
    "selectPrev": "k",
    "details": "return",
    "search": "/",
    "tab": "tab"
  },
  "database": {
    "path": "~/.local/share/opencode/opencode.db"
  },
  "logs": {
    "maxEntries": 100,
    "showToolInput": true,
    "showToolOutput": false
  }
}
```

### 8.2 配置文件位置

```
~/.config/omo-monitor/config.json
```

---

## 九、依赖清单

### 9.1 核心依赖

```json
{
  "dependencies": {
    "ink": "^4.4.1",
    "react": "^18.2.0",
    "better-sqlite3": "^9.4.3",
    "commander": "^11.1.0",
    "chalk": "^5.3.0",
    "figures": "^5.0.0",
    "ink-select-input": "^5.0.0",
    "ink-text-input": "^5.0.0",
    "conf": "^11.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/better-sqlite3": "^7.6.0",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "esbuild": "^0.19.0"
  }
}
```

---

## 十、实现步骤

### Phase 1: 项目初始化 (Day 1)

- [ ] 初始化 npm 项目
- [ ] 配置 TypeScript
- [ ] 安装依赖
- [ ] 设置项目结构

### Phase 2: 数据层 (Day 2)

- [ ] 实现 DatabaseService
- [ ] 实现 Agent 解析
- [ ] 实现 ToolCall 解析
- [ ] 实现 Token 统计

### Phase 3: 核心 UI (Day 3-4)

- [ ] 实现主布局组件
- [ ] 实现 AgentPanel
- [ ] 实现 DetailPanel
- [ ] 实现 LogPanel
- [ ] 实现 StatusBar

### Phase 4: 交互功能 (Day 5)

- [ ] 实现键盘导航
- [ ] 实现鼠标支持
- [ ] 实现 Agent 切换
- [ ] 实现自动刷新

### Phase 5: 配置和主题 (Day 6)

- [ ] 实现配置文件读取
- [ ] 实现主题切换
- [ ] 实现 CLI 参数

### Phase 6: 测试和发布 (Day 7)

- [ ] 编写测试
- [ ] 编写文档
- [ ] 发布到 npm

---

## 十一、扩展性设计

### 11.1 插件系统（未来）

```typescript
// 未来可以支持插件
interface MonitorPlugin {
  name: string;
  version: string;
  init: (app: MonitorApp) => void;
  destroy: () => void;
}
```

### 11.2 数据源扩展（未来）

```typescript
// 未来可以支持多种数据源
interface DataSource {
  getAgents(): Promise<Agent[]>;
  getLogs(sessionId: string): Promise<ToolCall[]>;
}

// SQLite 数据源
class SQLiteDataSource implements DataSource { ... }

// API 数据源（如果 OpenCode 未来提供）
class APIDataSource implements DataSource { ... }
```

---

## 十二、性能考虑

| 项目 | 策略 |
|------|------|
| 数据库查询 | 使用 prepared statements，避免重复解析 |
| 渲染优化 | React.memo 避免不必要的重渲染 |
| 内存控制 | 限制日志条数（默认 100 条） |
| 刷新策略 | 可配置刷新间隔，默认 2 秒 |

---

## 十三、错误处理

### 13.1 数据库不存在

```
⚠️ 数据库未找到: ~/.local/share/opencode/opencode.db

可能原因：
1. OpenCode 未安装或未运行
2. 数据库路径配置错误

解决方案：
1. 启动 OpenCode 后重试
2. 使用 --db 参数指定正确路径
```

### 13.2 权限错误

```
⚠️ 无法读取数据库: Permission denied

解决方案：
chmod 644 ~/.local/share/opencode/opencode.db
```

---

## 十四、测试策略

### 14.1 单元测试

- DatabaseService 方法测试
- Agent 解析测试
- Token 计算测试
- 配置加载测试

### 14.2 集成测试

- 完整数据流测试
- 组件渲染测试
- 交互测试

---

## 十五、发布清单

- [ ] 完善 README.md
- [ ] 添加 LICENSE (MIT)
- [ ] 配置 package.json 的 bin 字段
- [ ] 配置 TypeScript 编译
- [ ] 测试 npm publish --dry-run
- [ ] 创建 GitHub 仓库
- [ ] 发布到 npm

---

*文档版本: 1.0.0*
*最后更新: 2026-05-25*
