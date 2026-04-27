import fs from "fs/promises";
import logger from "../logger.js";

export async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warn(`目录不存在，创建目录: ${dirPath}`);
      await fs.mkdir(dirPath, { recursive: true });
    } else {
      throw error;
    }
  }
}

export async function saveJsonFile(filePath, data) {
  logger.debug(`准备写入JSON文件: ${filePath}`);
  await fs.writeFile(filePath, data, "utf8");
  logger.debug(`JSON文件写入成功: ${filePath}`);
}

export async function saveJsFile(filePath, data) {
  logger.debug(`准备写入JS文件: ${filePath}`);
  await fs.writeFile(filePath, data, "utf8");
  logger.debug(`JS文件写入成功: ${filePath}`);
}