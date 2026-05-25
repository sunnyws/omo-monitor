# omo-monitor 技术实现文档

## 架构概述

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Ink (React) │ ──▶ │ DatabaseSvc  │ ──▶ │  SQLite DB  │
│  TUI 渲染    │     │ 数据查询      │     │  opencode.db│
└─────────────┘     └──────────────┘     └─────────────┘
```

## 技术栈

| 技术 | 用途 |
|------|------|
| TypeScript | 主语言 |
| Ink 4.x | React for CLI（TUI 框架）|
| better-sqlite3 | SQLite 数据库读取 |
| Commander | CLI 参数解析 |
| chalk | 终端颜色 |

## 数据源

### OpenCode SQLite 数据库

位置：`~/.local/share/opencode/opencode.db`

#### 表结构

**session 表** — 会话记录
```sql
id              TEXT    -- 会话 ID
title           TEXT    -- 会话标题
agent           TEXT    -- Agent 名称 (Sisyphus-Junior, Explore, etc.)
model           TEXT    -- JSON: {"id":"mimo-v2.5-pro","providerID":"xiaomi-token-plan-sgp"}
parent_id       TEXT    -- 父会话 ID（为空表示父会话）
time_created    INTEGER -- 创建时间 (Unix ms)
time_updated    INTEGER -- 更新时间
time_archived   INTEGER -- 归档时间
tokens_input    INTEGER -- 输入 Token 数
tokens_output   INTEGER -- 输出 Token 数
tokens_reasoning INTEGER -- 推理 Token 数
cost            REAL    -- 费用
```

**message 表** — 模型调用记录
```sql
id              TEXT
session_id      TEXT    -- 关联的会话 ID
time_created    INTEGER
data            TEXT    -- JSON: {role, modelID, providerID, tokens, cost, ...}
```

**part 表** — 工具调用/推理/输出
```sql
id              TEXT
message_id      TEXT    -- 关联的消息 ID
session_id      TEXT    -- 关联的会话 ID
time_created    INTEGER
data            TEXT    -- JSON: {type, tool, state, text, ...}
```

### data 字段结构

**type = "tool"** (工具调用)
```json
{
  "type": "tool",
  "tool": "bash",
  "state": {
    "status": "completed",
    "input": {
      "command": "mvn clean compile",
      "description": "Maven compile",
      "timeout": 120000
    },
    "output": "BUILD SUCCESS"
  }
}
```

**type = "reasoning"** (模型推理)
```json
{
  "type": "reasoning",
  "text": "The user wants me to..."
}
```

**type = "text"** (文本输出)
```json
{
  "type": "text",
  "text": "The code has been refactored..."
}
```

**type = "step-start" / "step-finish"** (步骤)
```json
{
  "type": "step-start",
  "step": 1
}
```

## 核心实现

### 1. 会话层级关系

OpenCode 的会话有父子关系：

```
父会话 (parent_id = NULL)
├── 子会话 1 (parent_id = 父会话ID)
├── 子会话 2
└── 子会话 3
```

**查询父会话：**
```sql
SELECT * FROM session WHERE parent_id IS NULL OR parent_id = ''
ORDER BY time_created DESC LIMIT 10;
```

**查询子会话：**
```sql
SELECT * FROM session WHERE parent_id = ?
ORDER BY time_created ASC;
```

### 2. 活动日志获取

活动日志来自两个表：

1. **message 表** — 模型调用记录
   - `role = 'assistant'` 且有 `modelID` 表示一次模型调用

2. **part 表** — 工具调用、推理、输出
   - `type = 'tool'` — 工具调用（bash, read, edit, grep 等）
   - `type = 'reasoning'` — 模型推理过程
   - `type = 'text'` — Agent 文本输出
   - `type = 'step-start/finish'` — 步骤标记

**合并查询：**
```typescript
// 1. 获取 messages
const messages = db.prepare('SELECT * FROM message WHERE session_id = ?').all(sessionId);

// 2. 获取 parts
const parts = db.prepare('SELECT * FROM part WHERE session_id = ?').all(sessionId);

// 3. 合并并按时间排序
activities.sort((a, b) => a.time.getTime() - b.time.getTime());
```

### 3. 工具调用信息提取

不同工具类型提取不同字段：

| 工具 | 提取字段 |
|------|---------|
| bash | description + command + output |
| read/edit/write | filePath（转为相对路径）|
| grep | pattern + path + output |
| glob | pattern |
| todowrite | todos 列表 |

**路径简化：**
```typescript
const shortPath = fp.replace(/^\/Users\/[^/]+\/workspace\/[^/]+\//, '');
```

### 4. 布局自适应

```
┌─ header ────────────────────── 1行
├─ SEP ───────────────────────── 1行
├─ content ───────────────────── termH - 4行
│   ├─ info ──────────────────── 1行
│   ├─ task ──────────────────── 1行
│   ├─ tabs ──────────────────── 1行（可选）
│   ├─ SEP ───────────────────── 1行
│   ├─ log header ────────────── 1行
│   └─ log area ──────────────── min(25, termH - 12)行
├─ SEP ───────────────────────── 1行
└─ statusBar ─────────────────── 1行
```

**日志区域高度计算：**
```typescript
const fixedHeaderLines = hasTabs ? 5 : 4;
const logAreaH = Math.min(25, Math.max(3, contentMaxH - fixedHeaderLines));
```

### 5. 框内滚动

日志区域支持框内滚动，不影响上方 Agent 信息：

```typescript
const maxOffset = Math.max(0, totalLogs - logAreaH);
const offset = Math.min(logScrollOffset, maxOffset);
const visibleLogs = logs.slice(offset, offset + logAreaH);
```

**键盘映射：**
- `↑/↓` — 逐行滚动
- `PageUp/PageDown` — 翻页
- `g/G` — 跳转首/末条

### 6. Agent 切换

在详情视图中，用 `← →` 切换 Agent：

```typescript
if (key.leftArrow) {
  const idx = Math.max(0, agentIndex - 1);
  setAgentIndex(idx);
  setSelectedAgent(sessionAgents[idx]);
}
```

切换时自动：
1. 更新 `selectedAgent`
2. 重置 `logScrollOffset = 0`
3. 触发 `useEffect` 重新加载详情

## 已知限制

1. **只读数据库** — 使用 `readonly` 模式连接，不影响 OpenCode 运行
2. **实时性** — 通过定时刷新（默认 5 秒）获取最新数据，非 WebSocket 实时推送
3. **历史数据** — 只能查看已完成的会话，无法查看正在生成的流式输出
4. **数据库锁定** — 如果 OpenCode 正在写入，可能偶尔读取失败

## 后续规划

- [ ] 实时监控模式 — 自动刷新，高亮新增日志
- [ ] 搜索过滤 — 按工具类型、Agent 名称过滤
- [ ] 导出功能 — 将日志导出为 JSON/CSV
- [ ] Token 统计图表 — 可视化 Token 使用趋势
- [ ] 多数据库支持 — 同时监控多个 OpenCode 实例
