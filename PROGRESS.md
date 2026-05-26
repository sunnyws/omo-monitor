# omo-monitor 开发进度

## v1.0.0 (2026-05-26)

首个正式版本。

### 核心功能
- 三级导航：会话列表 -> Agent 列表 -> Agent 详情
- 实时读取 OpenCode SQLite 数据库
- 完整活动日志：模型调用、工具调用、推理、输出
- 自动刷新（可配置间隔）

### 表格对齐
- `displayWidth` 函数：正确处理 ANSI 转义码和 CJK 宽字符
- `padEndDisplay` / `padStartDisplay`：基于显示宽度对齐
- `buildRow` 表格构建函数：列间统一 1 字符间隔
- 所有行宽度严格一致，不受中文/英文/长数据影响

### 工具名中文映射
- 14 种数据库工具名全部映射为中文显示
- 消息类型（模型调用、推理、输出、步骤、系统）中文显示

### 数据库支持
- 支持 parent_id 父子会话关系
- 支持 message 表模型调用记录
- 支持 part 表工具调用、推理、文本等活动记录

### CLI
- Commander 参数解析：--version, --config, --db
- npm link 全局命令 `omo-monitor`
