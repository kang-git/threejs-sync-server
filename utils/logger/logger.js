/**
 * 日志记录器模块
 * 提供统一的日志记录功能
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');
const config = require('../../config');

// 确保日志目录存在
fs.ensureDirSync(config.logs.dir);

/**
 * 创建日志记录器
 * @param {string} name 日志记录器名称
 * @param {Object} options 配置选项
 * @returns {winston.Logger} 日志记录器实例
 */
function createLogger(name, options = {}) {
  const logOptions = {
    level: options.level || config.logs.level,
    console: options.console !== undefined ? options.console : true,
    file: options.file !== undefined ? options.file : true
  };
  
  // 创建格式化器
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp }) => {
      return `[${timestamp}] [${name}] [${level.toUpperCase()}]: ${message}`;
    })
  );
  
  // 创建传输器
  const transports = [];
  
  // 控制台传输器
  if (logOptions.console) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          logFormat
        )
      })
    );
  }
  
  // 文件传输器
  if (logOptions.file) {
    transports.push(
      new winston.transports.File({
        filename: path.join(config.logs.dir, `${name}.log`),
        format: logFormat,
        maxsize: config.logs.maxSize,
        maxFiles: config.logs.maxFiles
      })
    );
  }
  
  // 创建日志记录器
  return winston.createLogger({
    level: logOptions.level,
    transports
  });
}

module.exports = {
  createLogger
};