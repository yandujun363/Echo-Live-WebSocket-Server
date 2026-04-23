import { Router } from 'express';
import path from 'path';
import logger from '../logger.js';
import config from '../config.js';

const router = Router();

// 根路由
router.get('/', (req, res) => {
  logger.debug(`处理根路由请求，客户端IP: ${req.ip}`);
  res.sendFile(path.join(config.root, config.index), (err) => {
    if (err) {
      logger.error(`发送根路由文件时出错: ${err}`);
    } else {
      logger.debug(`成功发送根路由文件: ${config.index}`);
    }
  });
});

// 页面路由
const pages = ['live', 'settings', 'editor', 'history'];
pages.forEach(page => {
  router.get(`/${page}`, (req, res) => {
    logger.debug(`处理/${page}路由请求，客户端IP: ${req.ip}`);
    res.sendFile(path.join(config.root, `${page}.html`), (err) => {
      if (err) {
        logger.error(`发送${page}.html时出错: ${err}`);
      } else {
        logger.debug(`成功发送${page}.html`);
      }
    });
  });
});

export { router as pageRoutes };