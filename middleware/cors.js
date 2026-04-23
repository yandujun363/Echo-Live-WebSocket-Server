import logger from '../logger.js';
import config from '../config.js';

export function corsMiddleware(req, res, next) {
  logger.debug(`处理CORS请求: ${req.method} ${req.originalUrl}`);
  
  const origin = req.headers.origin;
  if (origin && config.origin === true) {
    logger.debug(`允许跨域请求来源: ${origin}`);
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    logger.debug(`处理OPTIONS预检请求: ${req.originalUrl}`);
    return res.sendStatus(204);
  }
  
  next();
}