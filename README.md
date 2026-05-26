# omo-monitor

实时监控 OpenCode + oh-my-openagent (omo) 子 Agent 的运行状态、工具调用和模型推理过程的 TUI 工具。

## 特性

- **会话管理** -- 按父会话组织，子会话按时间排序
- **Agent 监控** -- 实时显示运行中的 Agent 状态、Token 用量、耗时
- **完整活动日志** -- 模型调用、工具调用、推理过程、文本输出，中文显示
- **键盘导航** -- 框内滚动，不超出终端边界
- **颜色区分** -- 不同类型日志用不同颜色高亮
- **CJK 支持** -- 正确计算中文/emoji 显示宽度，表格列精确对齐
- **自动刷新** -- 可配置间隔自动更新数据

## 安装

```bash
cd omo-monitor
npm install
npm run build
npm link
```

## 使用

```bash
omo-monitor
```

命令行参数：

```bash
omo-monitor --version              # 查看版本
omo-monitor --config               # 显示配置
omo-monitor --db /path/to/opencode.db  # 指定数据库路径
```

## 快捷键

| 快捷键 | 会话列表 | Agent 列表 | Agent 详情 |
|--------|---------|-----------|-----------|
| `q`    | 退出    | 返回      | 返回      |
| `↑/↓`  | 上/下选择 | 上/下选择 | 向上/下滚动 |
| `←/→`  | --      | --        | 切换 Agent |
| `Enter`| 进入    | 进入详情  | --        |
| `Esc`  | --      | 返回      | 返回      |
| `g/G`  | --      | --        | 跳转首/末条 |

## 导航结构

```
会话列表 (父会话)
   +-- Agent 列表 (子会话)
       +-- Agent 详情
           +-- 活动日志 (工具调用、模型推理、输出)
```

## 日志类型

| 图标 | 类型 | 说明 |
|------|------|------|
| M    | 模型调用 | 模型 API 调用记录 |
| Q    | 推理   | 模型推理/思考过程 |
| O    | 输出   | 文本输出内容 |
| $    | 终端   | Shell 命令执行 |
| R    | 读取   | 文件读取 |
| W    | 写入   | 文件写入 |
| E    | 编辑   | 文件编辑 |
| G    | 搜索   | Grep 搜索 |
| A    | AST搜索 | AST Grep 搜索 |
| L    | 列举   | Glob 文件列举 |
| D    | 诊断   | LSP 诊断信息 |
| C    | Agent协作 | omo Agent 间调用 |
| K    | 子任务  | 后台子任务派发 |
| T    | 待办   | Todo 列表更新 |
| B    | 浏览器 | 浏览器操作 |
| ?    | 提问   | 向用户提问 |
| -    | 步骤   | 步骤开始/结束 |

## 配置

配置文件路径：`~/.config/omo-monitor/config.json`

```json
{
  "database": {
    "path": "~/.local/share/opencode/opencode.db"
  },
  "display": {
    "maxSessions": 10,
    "maxAgents": 20,
    "maxLogEntries": 100,
    "theme": "dark"
  },
  "refresh": {
    "interval": 5000
  }
}
```

## 技术栈

- TypeScript + Ink (React for CLI)
- better-sqlite3 (SQLite 读取)
- Commander (CLI 参数)

## 数据来源

读取 OpenCode 的 SQLite 数据库 (`~/.local/share/opencode/opencode.db`)：

- `session` 表 -- 会话信息、Token 用量、成本
- `message` 表 -- 消息记录（模型调用信息）
- `part` 表 -- 工具调用、推理、文本输出等活动记录

## License

MIT
