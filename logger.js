const winston = require('winston');
const fs = require('fs-extra');
const path = require('path');

// 日志目录路径
const LOG_DIR = path.join(__dirname, 'logs');

// 确保日志目录存在
fs.ensureDirSync(LOG_DIR);

/**
 * 清空指定的日志文件
 * @param {string} filename - 日志文件名，不包含路径和扩展名
 * @returns {boolean} - 操作是否成功
 */
function clearLog(filename) {
  try {
    const logFile = path.join(LOG_DIR, `${filename}.log`);
    if (fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, '');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`清空日志文件失败: ${error.message}`);
    return false;
  }
}

/**
 * 清空所有日志文件
 * @returns {Object} - 包含成功和失败的文件列表
 */
function clearAllLogs() {
  try {
    const files = fs.readdirSync(LOG_DIR);
    const results = {
      success: [],
      failed: []
    };
    
    files.forEach(file => {
      if (file.endsWith('.log')) {
        try {
          const filePath = path.join(LOG_DIR, file);
          fs.writeFileSync(filePath, '');
          results.success.push(file);
        } catch (error) {
          results.failed.push({ file, error: error.message });
        }
      }
    });
    
    return results;
  } catch (error) {
    console.error(`清空所有日志文件失败: ${error.message}`);
    return { success: [], failed: [{ error: error.message }] };
  }
}

/**
 * 创建一个日志记录器
 * @param {string} filename - 日志文件名，不包含路径和扩展名
 * @param {Object} options - 配置选项
 * @param {string} options.level - 日志级别，默认为'info'
 * @param {boolean} options.console - 是否输出到控制台，默认为true
 * @param {number} options.maxsize - 日志文件最大大小(字节)，默认为5MB
 * @param {number} options.maxFiles - 保留的最大日志文件数，默认为5
 * @returns {winston.Logger} - 日志记录器实例
 */
function createLogger(filename, options = {}) {
  // 默认选项
  const defaultOptions = {
    level: 'info',
    console: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  };

  // 合并选项
  const opts = { ...defaultOptions, ...options };
  
  // 日志文件完整路径
  const logFile = path.join(LOG_DIR, `${filename}.log`);

  // 创建传输器数组
  const transports = [];
  
  // 如果需要控制台输出
  if (opts.console) {
    transports.push(new winston.transports.Console());
  }
  
  // 添加文件传输器
  transports.push(
    new winston.transports.File({
      filename: logFile,
      maxsize: opts.maxsize,
      maxFiles: opts.maxFiles,
      tailable: true
    })
  );

  // 创建并返回日志记录器
  return winston.createLogger({
    level: opts.level,
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    transports: transports
  });
}

module.exports = { createLogger, clearLog, clearAllLogs };
