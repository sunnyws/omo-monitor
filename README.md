# omo-monitor

实时监控 OpenCode + oh-my-openagent (omo) 子 Agent 的运行状态、工具调用和模型推理过程。

## ✨ 特性

- 📋 **会话管理** — 按父会话组织，子会话按时间排序
- 🤖 **Agent 监控** — 实时显示运行中的 Agent 状态
- 📊 **完整活动日志** — 模型调用、工具调用、推理过程、文本输出
- ⌨️ **键盘导航** — 框内滚动，不超出终端边界
- 🎨 **颜色区分** — 不同类型日志用不同颜色高亮

## 📦 安装

```bash
cd omo-monitor
npm install
npm run build
npm link
```

## 🚀 使用

```bash
omo-monitor
```

### 命令行参数

```bash
omo-monitor --version              # 查看版本
omo-monitor --config               # 显示配置
omo-monitor --db /path/to/db       # 指定数据库路径
```

## ⌨️ 快捷键

| 快捷键 | 会话列表 | Agent 列表 | Agent 详情 |
|--------|---------|-----------|-----------|
| `q` | 退出 | 返回 | 返回 |
| `↑` | 上一个 | 上一个 | 向上滚动 |
| `↓` | 下一个 | 下一个 | 向下滚动 |
| `←` | — | — | 切换上一个Agent |
| `→` | — | — | 切换下一个Agent |
| `Enter` | 进入 | 进入详情 | — |
| `Esc` | — | 返回 | 返回 |
| `r` | 刷新 | 刷新 | 刷新 |
| `g` | — | — | 跳转首条日志 |
| `G` | — | — | 跳转末条日志 |
| `PageUp` | — | — | 向上翻页 |
| `PageDown` | — | — | 向下翻页 |

## 📖 导航结构

```
会话列表 (父会话)
   ↓ Enter
Agent 列表 (子会话)
   ↓ Enter
Agent 详情
   ├─ Agent 信息栏 (模型、耗时、Token)
   ├─ 任务描述
   ├─ Agent Tabs (← → 切换)
   └─ 活动日志框 (最多25行，↑↓ 框内滚动)
       ├─ 🤖 模型调用 (模型名称)
       ├─ 🧠 推理 (完整推理过程)
       ├─ 💬 输出 (Agent 文本输出)
       ├─ bash (描述 + 命令 + 执行结果)
       ├─ read/edit/write (相对路径)
       ├─ grep/glob (搜索模式 + 结果)
       └─ ▶/✓ 步骤 (步骤开始/完成)
```

## 🔧 配置

配置文件位置：`~/.config/omo-monitor/config.json`

```json
{
  "databasePath": "~/.local/share/opencode/opencode.db",
  "refreshInterval": 5000,
  "maxSessions": 10,
  "theme": "dark"
}
```

## 📊 数据来源

从 OpenCode 的 SQLite 数据库读取：

| 表 | 内容 | 用途 |
|---|---|---|
| `session` | 会话记录 | 会话列表、Agent 列表 |
| `message` | 模型调用记录 | 🤖 模型调用日志 |
| `part` | 工具调用/推理/文本 | 🔧 工具调用、🧠 推理、💬 输出 |

### 数据结构

```
session (父会话)
├── session (子会话 1) → message + part
├── session (子会话 2) → message + part
└── session (子会话 3) → message + part
```

- 父会话：`parent_id` 为空
- 子会话：`parent_id` 指向父会话

## 🎯 日志信息

每条日志包含的信息：

| 类型 | 显示内容 |
|------|---------|
| bash | 描述 + 完整命令 + 执行结果 |
| read/edit/write | 相对路径（自动去掉 `$HOME/workspace/` 前缀）|
| grep | 搜索模式 + 搜索路径 + 匹配结果 |
| 推理 | 完整推理文本（150 字符）|
| 输出 | Agent 文本输出 |
| 模型调用 | 模型名称 |

## 📁 项目结构

```
omo-monitor/
├── src/
│   ├── cli.ts              # CLI 入口
│   ├── index.tsx           # Ink 渲染入口
│   ├── app.tsx             # 主应用组件
│   ├── services/
│   │   ├── database.ts     # SQLite 数据库服务
│   │   └── config.ts       # 配置管理
│   ├── types/
│   │   ├── agent.ts        # Agent 相关类型
│   │   ├── config.ts       # 配置类型
│   │   └── database.ts     # 数据库行类型
│   └── utils/
│       └── format.ts       # 格式化工具函数
├── config/
│   └── default.json        # 默认配置
├── package.json
├── tsconfig.json
└── README.md
```

## 📝 更新日志

### v1.5.0 (2026-05-25)
- ✨ 日志框最多 25 行，框内滚动
- ✨ 状态栏紧跟内容，不留空行
- ✨ 分隔线适配终端宽度
- ✨ 整体布局适配终端高度

### v1.4.0 (2026-05-25)
- ✨ 新布局：Agent tabs 上方，日志下方
- ✨ ← → 快速切换 Agent
- ✨ 日志显示更多信息（描述、命令、结果）
- ✨ 不同类型颜色区分

### v1.3.0 (2026-05-25)
- ✨ 显示模型调用（从 message 表获取）
- ✨ 完整活动日志

### v1.2.0 (2026-05-25)
- ✨ 只显示父会话
- ✨ 子会话按时间排序

### v1.1.0 (2026-05-25)
- ✨ 三级导航：会话 → Agent → 详情

### v1.0.0 (2026-05-25)
- 🎉 初始发布

## License

MIT
