import { WebSocketServer, WebSocket } from 'ws';
import logger from '../logger.js';
import config from '../config.js';
import { handleMessage } from './handlers.js';

export const channelMap = new Map(); // 存储所有频道 {channelName: Set<clients>}

export function createWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    verifyClient: (info, done) => {
      const wsPath = config.WebSocket;
      const normalizedUrl = info.req.url.endsWith('/') 
        ? info.req.url.slice(0, -1) 
        : info.req.url;

      if (normalizedUrl === wsPath) {
        return done(true);
      }

      if (normalizedUrl.startsWith(wsPath + '/')) {
        const channelPart = normalizedUrl.substring(wsPath.length + 1);
        if (channelPart && !channelPart.includes('/')) {
          return done(true);
        }
      }

      logger.warn(`拒绝WebSocket连接: 无效路径 ${info.req.url}`);
      return done(false, 404, 'Not Found');
    }
  });

  wss.on('connection', (ws, req) => {
    logger.info(`新的WebSocket连接，客户端地址: ${req.socket.remoteAddress}`);

    const normalizedUrl = req.url.endsWith('/') ? req.url.slice(0, -1) : req.url;
    const pathWithoutBase = normalizedUrl.substring(config.WebSocket.length);
    const channelName = pathWithoutBase.split('/')[1] || 'global';

    if (!channelMap.has(channelName)) {
      channelMap.set(channelName, new Set());
    }
    const channelClients = channelMap.get(channelName);
    channelClients.add(ws);

    // 每30秒发送一次Ping
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on('pong', () => {
      logger.debug(`收到客户端 Pong 响应，频道: ${channelName}`);
    });

    ws.on('message', (message) => {
      handleMessage(ws, message, channelName, channelClients, channelMap);
    });

    ws.on('close', () => {
      logger.info(`WebSocket客户端断开连接，频道: ${channelName}`);
      clearInterval(pingInterval);
      channelClients.delete(ws);
      if (channelClients.size === 0) {
        channelMap.delete(channelName);
      }
    });

    ws.on('error', (error) => {
      logger.error(`WebSocket错误，频道: ${channelName}: ${error.stack || error}`);
    });
  });

  return wss;
}