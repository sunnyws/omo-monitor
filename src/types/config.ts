/**
 * Configuration type definitions
 */

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
    tab: string;                 // 切换面板, 默认 'Tab'
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

export const DEFAULT_CONFIG: Config = {
  refresh: {
    interval: 2000,
    autoRefresh: true,
  },
  display: {
    theme: 'dark',
    showTimestamp: true,
    maxLogLines: 100,
    dateFormat: 'HH:mm:ss',
  },
  keybindings: {
    quit: 'q',
    refresh: 'r',
    selectNext: 'j',
    selectPrev: 'k',
    details: 'return',
    search: '/',
    tab: 'tab',
  },
  database: {
    path: '~/.local/share/opencode/opencode.db',
  },
  logs: {
    maxEntries: 100,
    showToolInput: true,
    showToolOutput: false,
  },
};
