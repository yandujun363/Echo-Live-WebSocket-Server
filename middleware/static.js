import express from 'express';
import logger from '../logger.js';
import config from '../config.js';
import { ensureDirectoryExists } from '../utils/file.js';

// 确保静态文件目录存在
ensureDirectoryExists(config.root);

export const staticMiddleware = express.static(config.root, {
  setHeaders: (res, path) => {
    logger.debug(`发送静态文件: ${path}`);
  }
});