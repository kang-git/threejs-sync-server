# Three.js 源码同步工具

这是一个Node.js应用程序，用于定期从GitHub拉取Three.js源码仓库到本地。

## 功能特点

- 自动定期从GitHub拉取最新的Three.js源码
- 可配置的同步计划（使用cron表达式）
- 支持首次启动时立即同步
- 简单易用的配置文件

## 安装

1. 克隆本仓库到本地
2. 安装依赖

```bash
npm install
```

## 配置

编辑`config.json`文件来自定义同步计划：

```json
{
  "schedule": "0 2 * * *",  // cron表达式，默认每天凌晨2点执行
  "syncOnStart": true       // 是否在启动时立即执行一次同步
}
```

### Cron表达式说明

cron表达式格式为：`分 时 日 月 周`

例如：
- `0 2 * * *` - 每天凌晨2点执行
- `0 */6 * * *` - 每6小时执行一次
- `0 9,18 * * *` - 每天上午9点和下午6点执行
- `0 9 * * 1-5` - 每个工作日（周一至周五）上午9点执行

## 使用方法

### 启动定时同步服务

```bash
npm start
```

### 手动执行一次同步

```bash
npm run sync
```

## 文件说明

- `index.js` - 主程序，设置定时任务
- `sync.js` - 执行从GitHub拉取Three.js源码的操作
- `config.json` - 配置文件
- `package.json` - 项目依赖和脚本

## 依赖项

- simple-git - 用于Git操作
- node-cron - 用于定时任务
- fs-extra - 提供更多文件操作功能