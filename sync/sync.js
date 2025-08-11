const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');
const { createLogger } = require('../utils/logger/logger');
const config = require('../config');

// 从配置文件获取参数
const THREEJS_REPO = config.backupRepoUrl || 'https://gitee.com/mirrors/three.js.git'; // 使用Gitee镜像作为主要仓库
const BACKUP_REPO = config.repoUrl || 'https://github.com/mrdoob/three.js.git'; // GitHub作为备用
const LOCAL_PATH = config.repoPath;
const MAX_RETRIES = config.sync?.maxRetries || 3;
const RETRY_DELAY = config.sync?.retryDelay || 5000; // 5秒

// 创建日志记录器
const logger = createLogger('sync', {
  level: 'info',
  console: true,
  maxsize: 5242880, // 5MB
  maxFiles: 5
});

/**
 * 延迟函数
 * @param {number} ms 延迟毫秒数
 * @returns {Promise} 延迟Promise
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试机制的Git克隆
 * @param {string} repo 仓库URL
 * @param {string} targetPath 目标路径
 * @param {number} retries 重试次数
 * @returns {Promise} 克隆结果
 */
async function gitCloneWithRetry(repo, targetPath, retries = MAX_RETRIES) {
  try {
    logger.info(`尝试克隆仓库: ${repo}`);
    await simpleGit().clone(repo, targetPath);
    logger.info('仓库克隆成功！');
    return true;
  } catch (error) {
    logger.error(`克隆失败: ${error.message}`);
    
    if (retries > 0) {
      logger.info(`将在${RETRY_DELAY/1000}秒后重试，剩余重试次数: ${retries-1}`);
      await delay(RETRY_DELAY);
      return gitCloneWithRetry(repo, targetPath, retries - 1);
    } else {
      // 如果是主仓库失败且有备用仓库，尝试备用仓库
      if (repo === THREEJS_REPO && BACKUP_REPO) {
        logger.info(`主仓库克隆失败，尝试使用备用镜像: ${BACKUP_REPO}`);
        return gitCloneWithRetry(BACKUP_REPO, targetPath, MAX_RETRIES);
      }
      throw new Error(`克隆仓库失败，已达到最大重试次数: ${error.message}`);
    }
  }
}

/**
 * 带重试机制的Git拉取
 * @param {Object} git SimpleGit实例
 * @param {number} retries 重试次数
 * @returns {Promise} 拉取结果
 */
async function gitPullWithRetry(git, retries = MAX_RETRIES) {
  try {
    logger.info('尝试拉取最新代码...');
    await git.pull();
    logger.info('代码拉取成功！');
    return true;
  } catch (error) {
    logger.error(`拉取失败: ${error.message}`);
    
    if (retries > 0) {
      logger.info(`将在${RETRY_DELAY/1000}秒后重试，剩余重试次数: ${retries-1}`);
      await delay(RETRY_DELAY);
      return gitPullWithRetry(git, retries - 1);
    } else {
      throw new Error(`拉取代码失败，已达到最大重试次数: ${error.message}`);
    }
  }
}

/**
 * 同步Three.js仓库到本地
 */
async function syncThreeJsRepo() {
  try {
    logger.info('开始同步Three.js仓库...');
    logger.info(`时间: ${new Date().toLocaleString()}`);
    
    // 检查本地目录是否存在
    const exists = await fs.pathExists(LOCAL_PATH);
    
    if (!exists) {
      // 如果目录不存在，克隆仓库
      logger.info(`本地目录不存在，正在创建目录并克隆仓库到 ${LOCAL_PATH}...`);
      await fs.ensureDir(LOCAL_PATH);
      
      try {
        await gitCloneWithRetry(THREEJS_REPO, LOCAL_PATH);
      } catch (cloneError) {
        // 如果所有克隆尝试都失败
        logger.error('所有克隆尝试均失败:', cloneError);
        await fs.remove(LOCAL_PATH);
        throw cloneError;
      }
    } else {
      // 如果目录存在，检查是否是有效的git仓库
      logger.info(`本地目录已存在，检查是否是有效的git仓库...`);
      
      // 检查.git目录是否存在
      const isGitRepo = await fs.pathExists(path.join(LOCAL_PATH, '.git'));
      
      if (!isGitRepo) {
        // 如果不是有效的git仓库，删除目录并重新克隆
        logger.warn(`${LOCAL_PATH} 不是有效的git仓库，将删除并重新克隆...`);
        await fs.remove(LOCAL_PATH);
        await fs.ensureDir(LOCAL_PATH);
        
        try {
          await gitCloneWithRetry(THREEJS_REPO, LOCAL_PATH);
        } catch (cloneError) {
          // 如果所有克隆尝试都失败
          logger.error('所有克隆尝试均失败:', cloneError);
          await fs.remove(LOCAL_PATH);
          throw cloneError;
        }
      } else {
        try {
          // 如果是有效的git仓库，尝试拉取最新代码
          const git = simpleGit(LOCAL_PATH);
          
          // 检查远程仓库连接是否正常
          logger.info('检查远程仓库连接...');
          try {
            await git.remote(['get-url', 'origin']);
            
            // 尝试拉取最新代码
            await gitPullWithRetry(git);
          } catch (remoteError) {
            logger.error('远程仓库连接异常:', remoteError);
            logger.warn('将重新设置远程仓库地址...');
            
            try {
              // 尝试重新设置远程仓库地址
              await git.remote(['set-url', 'origin', THREEJS_REPO]);
              await gitPullWithRetry(git);
            } catch (resetError) {
              // 如果重置远程仓库后仍然失败，尝试使用备用仓库
              if (BACKUP_REPO) {
                logger.warn(`尝试使用备用镜像仓库: ${BACKUP_REPO}`);
                try {
                  await git.remote(['set-url', 'origin', BACKUP_REPO]);
                  await gitPullWithRetry(git);
                } catch (backupError) {
                  // 如果备用仓库也失败，删除并重新克隆
                  logger.error('使用备用仓库也失败，将删除并重新克隆:', backupError);
                  await fs.remove(LOCAL_PATH);
                  await fs.ensureDir(LOCAL_PATH);
                  await gitCloneWithRetry(THREEJS_REPO, LOCAL_PATH);
                }
              } else {
                // 如果没有备用仓库，删除并重新克隆
                logger.error('重置远程仓库后仍然失败，将删除并重新克隆:', resetError);
                await fs.remove(LOCAL_PATH);
                await fs.ensureDir(LOCAL_PATH);
                await gitCloneWithRetry(THREEJS_REPO, LOCAL_PATH);
              }
            }
          }
        } catch (pullError) {
          // 如果拉取失败，可能是仓库损坏，删除并重新克隆
          logger.error('拉取代码失败，可能是仓库损坏:', pullError);
          logger.warn('将删除损坏的仓库并重新克隆...');
          await fs.remove(LOCAL_PATH);
          await fs.ensureDir(LOCAL_PATH);
          await gitCloneWithRetry(THREEJS_REPO, LOCAL_PATH);
        }
      }
    }
    
    logger.info('同步操作成功完成！');
  } catch (error) {
    logger.error('同步过程中发生错误:', error);
    logger.error(error.stack || error.toString());
    throw error; // 重新抛出错误，让调用者知道同步失败
  }
}

// 如果直接运行此脚本，则执行同步
if (require.main === module) {
  syncThreeJsRepo();
}

module.exports = { syncThreeJsRepo, logger };
