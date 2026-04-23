import fs from 'fs';
import path from 'path';
import logger from '../logger.js';

export function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    logger.warn(`目录不存在，创建目录: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function saveJsonFile(filePath, data) {
  logger.debug(`准备写入文件: ${filePath}`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  logger.debug(`文件写入成功: ${filePath}`);
}