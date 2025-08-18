/**
 * Web服务器模块
 * 提供Three.js网站的本地访问
 */

const os = require('os');
const express = require("express");
const path = require("path");
const { createLogger } = require("../utils/logger/logger");
const config = require("../config");

// 创建日志记录器
const logger = createLogger("server", {
  level: "info",
  console: true,
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
  app.get("/", (req, res) => {
    res.sendFile(path.join(config.websitePath, "index.html"));
  });

  // 状态API
  app.get("/api/status", (req, res) => {
    res.json({
      status: "running",
      version: require("../package.json").version,
      lastSync: new Date().toISOString(),
    });
  });

  // 启动服务器
  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(port, host, () => {
        // 获取本机IP
        const interfaces = os.networkInterfaces();
        let localIp = "127.0.0.1";
        for (const name of Object.keys(interfaces)) {
          for (const iface of interfaces[name]) {
            if (iface.family === "IPv4" && !iface.internal) {
              localIp = iface.address;
              break;
            }
          }
        }
        logger.info(`Web服务器已启动:`);
        logger.info(`  http://localhost:${port}`);
        logger.info(`  http://${localIp}:${port}`);
        resolve(server);
      });
    } catch (error) {
      logger.error("Web服务器启动失败:", error);
      reject(error);
    }
  });
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  startServer();
}

module.exports = {
  startServer,
};
