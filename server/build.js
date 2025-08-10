/**
 * Three.js官网打包脚本
 * 该脚本用于构建与Three.js官网一致的本地版本
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { createLogger } = require('../utils/logs/logger');

// 创建日志记录器
const logger = createLogger('build', {
  level: 'info',
  console: true
});

// Three.js仓库路径
const THREEJS_REPO_PATH = path.join(__dirname, '../three.js-repo');
// 输出目录
const OUTPUT_DIR = path.join(__dirname, '../website');

/**
 * 执行命令并记录输出
 * @param {string} command 要执行的命令
 * @param {string} cwd 工作目录
 */
function runCommand(command, cwd, timeout = 600000) { // 默认10分钟超时
  logger.info(`执行命令: ${command}`);
  logger.info(`工作目录: ${cwd}`);
  logger.info(`超时设置: ${timeout / 1000}秒`);
  
  try {
    const output = execSync(command, { 
      cwd, 
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: timeout // 添加超时设置
    });
    logger.info(`命令执行成功: ${command}`);
    return output;
  } catch (error) {
    if (error.signal === 'SIGTERM') {
      logger.error(`命令执行超时: ${command}`);
      throw new Error(`命令执行超时: ${command}`);
    } else {
      logger.error(`命令执行失败: ${command}`);
      logger.error(error.message);
      throw error;
    }
  }
}

/**
 * 构建Three.js库文件
 */
async function buildThreeJs() {
  logger.info('开始构建Three.js库文件...');
  
  try {
    // 检查是否已安装依赖
    const nodeModulesPath = path.join(THREEJS_REPO_PATH, 'node_modules');
    const hasNodeModules = await fs.pathExists(nodeModulesPath);
    
    if (!hasNodeModules) {
      logger.info('安装Three.js依赖...');
      try {
        // 使用--no-fund --no-audit参数加速安装过程
        runCommand('npm install --no-fund --no-audit --loglevel=error', THREEJS_REPO_PATH, 1200000); // 20分钟超时
      } catch (installError) {
        logger.warn('完整依赖安装失败，尝试使用--production标志安装最小依赖...');
        // 如果完整安装失败，尝试只安装生产依赖
        runCommand('npm install --production --no-fund --no-audit --loglevel=error', THREEJS_REPO_PATH, 600000);
      }
    }
    
    // 构建Three.js
    logger.info('构建Three.js...');
    runCommand('npm run build', THREEJS_REPO_PATH, 600000);
    
    logger.info('Three.js库文件构建完成');
  } catch (error) {
    logger.error('构建Three.js库文件失败:', error);
    logger.warn('尝试使用预构建的文件...');
    
    // 检查是否有build目录
    const buildDir = path.join(THREEJS_REPO_PATH, 'build');
    const hasBuildDir = await fs.pathExists(buildDir);
    
    if (!hasBuildDir) {
      logger.error('没有找到预构建文件，构建失败');
      throw error;
    } else {
      logger.info('找到预构建文件，跳过构建步骤');
    }
  }
}

/**
 * 构建Three.js文档
 */
async function buildDocs() {
  logger.info('开始构建Three.js文档...');
  
  try {
    // 构建文档
    runCommand('npm run build-docs', THREEJS_REPO_PATH);
    
    logger.info('Three.js文档构建完成');
  } catch (error) {
    logger.error('构建Three.js文档失败:', error);
    throw error;
  }
}

/**
 * 复制网站文件到输出目录
 */
async function copyWebsiteFiles() {
  logger.info('开始复制网站文件...');
  
  try {
    // 确保输出目录存在
    await fs.ensureDir(OUTPUT_DIR);
    
    // 复制必要的目录
    const dirsToCopy = ['build', 'docs', 'examples', 'manual', 'files'];
    
    for (const dir of dirsToCopy) {
      const srcDir = path.join(THREEJS_REPO_PATH, dir);
      const destDir = path.join(OUTPUT_DIR, dir);
      
      logger.info(`复制目录: ${dir}`);
      await fs.copy(srcDir, destDir);
    }
    
    // 注意：首页由用户自行编写，不需要复制
    logger.info('首页由用户自行编写，跳过复制步骤');
    
    logger.info('网站文件复制完成');
  } catch (error) {
    logger.error('复制网站文件失败:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  logger.info('开始构建Three.js官网...');
  
  try {
    // 检查Three.js仓库是否存在
    const repoExists = await fs.pathExists(THREEJS_REPO_PATH);
    
    if (!repoExists) {
      logger.error(`Three.js仓库不存在: ${THREEJS_REPO_PATH}`);
      return;
    }
    
    // 构建Three.js库文件
    await buildThreeJs();
    
    // 构建文档
    await buildDocs();
    
    // 复制网站文件
    await copyWebsiteFiles();
    
    logger.info(`Three.js官网构建完成，输出目录: ${OUTPUT_DIR}`);
  } catch (error) {
    logger.error('构建Three.js官网失败:', error);
  }
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main();
}

module.exports = { main };