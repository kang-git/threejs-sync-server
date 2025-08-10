const cron = require('node-cron');
const { syncThreeJsRepo } = require('./sync');
const { createLogger } = require('./logger');
const path = require('path');
const fs = require('fs-extra');

// 创建日志记录器
const logger = createLogger('index', {
  level: 'info',
  console: true,
  maxsize: 5242880, // 5MB
  maxFiles: 5
});

// 配置文件路径
const CONFIG_PATH = path.join(__dirname, 'config.json');

// 默认配置
const DEFAULT_CONFIG = {
  // 默认每天凌晨2点执行同步
  schedule: '0 2 * * *',
  // 是否在启动时立即执行一次同步
  syncOnStart: true
};

/**
 * 读取配置文件
 */
async function loadConfig() {
  try {
    // 检查配置文件是否存在
    const exists = await fs.pathExists(CONFIG_PATH);
    
    if (!exists) {
      // 如果不存在，创建默认配置文件
      logger.info('配置文件不存在，创建默认配置...');
      await fs.writeJson(CONFIG_PATH, DEFAULT_CONFIG, { spaces: 2 });
      return DEFAULT_CONFIG;
    }
    
    // 读取配置文件
    const config = await fs.readJson(CONFIG_PATH);
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    logger.error('读取配置文件失败:', error);
    logger.error(error.stack || error.toString());
    return DEFAULT_CONFIG;
  }
}

/**
 * 启动定时同步任务
 */
async function startSyncScheduler() {
  try {
    // 加载配置
    const config = await loadConfig();
    logger.info('已加载配置:', JSON.stringify(config, null, 2));
    
    // 如果配置了启动时同步，则立即执行一次
    if (config.syncOnStart) {
      logger.info('正在执行启动时同步...');
      await syncThreeJsRepo();
    }
    
    // 设置定时任务
    logger.info(`设置定时任务，调度表达式: ${config.schedule}`);
    cron.schedule(config.schedule, () => {
      logger.info('执行定时同步任务...');
      syncThreeJsRepo();
    });
    
    logger.info(`Three.js同步服务已启动，将按照计划 "${config.schedule}" 定期同步`);
    logger.info('按 Ctrl+C 停止服务');
  } catch (error) {
    logger.error('启动同步调度器失败:', error);
    logger.error(error.stack || error.toString());
  }
}

// 启动服务
startSyncScheduler();