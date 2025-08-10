/**
 * Web服务器模块
 * 提供Three.js网站的本地访问
 */

const express = require('express');
const path = require('path');
const { createLogger } = require('../utils/logs/logger');
const config = require('../config');

// 创建日志记录器
const logger = createLogger('server', {
  level: 'info',
  console: true
});

/**
 * 启动Web服务器
 */
async function startServer() {
  const app = express();
  const port = config.server.port;
  const host = config.server.host;
  
  // 静态文件服务
  app.use(express.static(config.websitePath));
  
  // 首页路由
  app.get('/', (req, res) => {
    res.sendFile(path.join(config.websitePath, 'index.html'));
  });
  
  // 状态API
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'running',
      version: require('../package.json').version,
      lastSync: new Date().toISOString()
    });
  });
  
  // 启动服务器
  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(port, host, () => {
        logger.info(`Web服务器已启动: http://${host}:${port}`);
        resolve(server);
      });
    } catch (error) {
      logger.error('Web服务器启动失败:', error);
      reject(error);
    }
  });
}

module.exports = {
  startServer
};