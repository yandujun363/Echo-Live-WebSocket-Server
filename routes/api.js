import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import logger from '../logger.js';
import config from '../config.js';
import { saveJsonFile, ensureDirectoryExists } from '../utils/file.js';

const router = Router();

router.post(config.saveEndpoint, (req, res) => {
  logger.debug(`处理API请求: ${req.method} ${req.originalUrl}`);
  logger.debug(`请求体内容: ${JSON.stringify(req.body)}`);

  const { name, root, data } = req.body;
  if (!name || !root || !data) {
    const errorMsg = '保存配置失败: 请求体缺少必要字段';
    logger.debug(`验证失败: ${errorMsg}`);
    return res.status(400).json({ error: errorMsg });
  }

  try {
    ensureDirectoryExists(root);
    const filePath = path.join(root, name);
    saveJsonFile(filePath, data);

    res.json({
      success: true,
      message: '配置文件保存成功',
      path: filePath
    });
    
    logger.debug(`发送成功响应: ${JSON.stringify({ success: true, message: '配置文件保存成功', path: filePath })}`);
  } catch (error) {
    logger.debug(`保存配置时捕获到错误: ${error.stack || error}`);
    res.status(500).json({ error: error.message });
    logger.debug(`发送错误响应: ${JSON.stringify({ error: error.message })}`);
  }
});

export default router;