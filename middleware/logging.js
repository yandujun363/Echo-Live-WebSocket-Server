import logger from '../logger.js';

export function requestLogger(req, res, next) {
  logger.debug(`收到请求: ${req.method} ${req.originalUrl}`);
  logger.debug(`请求头: ${JSON.stringify(req.headers)}`);
  logger.debug(`请求体: ${JSON.stringify(req.body)}`);
  next();
}