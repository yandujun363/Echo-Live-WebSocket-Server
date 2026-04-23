import winston from 'winston';
import config from './config.js';

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}] ${message}`;
});

const consoleFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}] ${message}`;
});

// 创建logger实例
const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), logFormat),
  transports: []
});

// 配置控制台输出
if (config.logging.consoleOutput) {
  logger.add(
    new winston.transports.Console({
      format: combine(colorize(), consoleFormat)
    })
  );
}

// 配置文件输出
if (config.logging.fileOutput) {
  logger.add(
    new winston.transports.File({
      filename: config.logging.filePath,
      format: logFormat
    })
  );
}

export default logger;