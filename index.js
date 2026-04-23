import express from 'express';
import dns from 'dns';
import { randomUUID } from 'crypto';
import WebSocket from 'ws';
import config from './config.js';
import logger from './logger.js';
import { getAllIPs, isIPv6 } from './utils/network.js';
import { requestLogger } from './middleware/logging.js';
import { corsMiddleware } from './middleware/cors.js';
import { staticMiddleware } from './middleware/static.js';
import apiRoutes from './routes/api.js';
import pageRoutes from './routes/pages.js';
import { createWebSocketServer, channelMap } from './websocket/server.js';

const app = express();

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(corsMiddleware);
app.use(staticMiddleware);

// 路由
app.use('/', pageRoutes);
app.use('/', apiRoutes);

// 404处理
app.use((req, res) => {
  logger.warn(`404错误: 请求路径 ${req.path} 不存在`);
  res.status(404).send('404 Not Found');
});

// 存储所有服务器实例
const servers = [];

// 创建服务器并监听指定地址
const createServer = (host, isFirstServer = false) => {
  const server = app.listen(config.port, host, () => {
    const addressType = host.includes(':') ? 'IPv6' : 'IPv4';
    logger.info(`服务器已启动 (${addressType})`);
    
    if (isFirstServer) {
      const ips = getAllIPs();
      if (config.host !== 'localhost') {
        logger.info(`静态文件服务路径: ${config.root}`);
        logger.info(`访问地址: http://${config.host}:${config.port}/`);
        logger.info(`保存API地址: http://${config.host}:${config.port}${config.saveEndpoint}`);
        logger.info(`WebSocket地址: ws://${config.host}:${config.port}${config.WebSocket}`);
      }
      if (config.host === 'localhost') {
        for (const ip of ips) {
          if (!isIPv6(ip)) {
            logger.info(`访问地址 (IPv4): http://${ip}:${config.port}/`);
            logger.info(`保存API地址 (IPv4): http://${ip}:${config.port}${config.saveEndpoint}`);
            logger.info(`WebSocket地址 (IPv4): ws://${ip}:${config.port}${config.WebSocket}`);
          } else {
            logger.info(`访问地址 (IPv6): http://[${ip}]:${config.port}/`);
            logger.info(`保存API地址 (IPv6): http://[${ip}]:${config.port}${config.saveEndpoint}`);
            logger.info(`WebSocket地址 (IPv6): ws://[${ip}]:${config.port}${config.WebSocket}`);
          }
        }
      }
    }
  });

  // 创建WebSocket服务器
  createWebSocketServer(server);
  
  return server;
};

// 启动服务器
const startServers = () => {
  if (config.host.toLowerCase() === 'localhost') {
    const addresses = ['0.0.0.0'];
    if (config.ipv6Support) {
      addresses.push('::');
    }
    
    addresses.forEach((host, index) => {
      try {
        servers.push(createServer(host, index === 0));
        logger.info(`正在监听所有地址: ${host}`);
      } catch (error) {
        logger.error(`无法监听地址 ${host}: ${error}`);
      }
    });
  } else {
    dns.lookup(config.host, { all: true }, (err, addresses) => {
      if (err) {
        logger.error(`DNS解析错误: ${err}`);
        process.exit(1);
      }
      
      const uniqueAddresses = [...new Set(addresses.map(addr => addr.address))];
      const filteredAddresses = config.ipv6Support
        ? uniqueAddresses
        : uniqueAddresses.filter(addr => !addr.includes(':'));
      
      filteredAddresses.forEach((host, index) => {
        try {
          servers.push(createServer(host, index === 0));
          logger.info(`正在监听地址: ${host}`);
        } catch (error) {
          logger.error(`无法监听地址 ${host}: ${error}`);
        }
      });
      
      if (servers.length === 0) {
        logger.error('没有可用的监听地址');
        process.exit(1);
      }
    });
  }
};

startServers();

// 优雅关闭
process.on('SIGINT', () => {
  logger.info('服务器正在关闭...');
  
  const uuid = 'server-' + randomUUID();
  
  const closeWebsocket = {
    action: 'websocket_close',
    target: undefined,
    from: {
      name: '@__ws_server',
      uuid: uuid,
      type: 'server',
      timestamp: Date.now()
    },
    data: {}
  };
  
  const closeBroadcast = {
    action: 'broadcast_close',
    from: {
      name: '@__ws_server',
      uuid: uuid,
      type: 'server',
      timestamp: Date.now()
    },
    data: {}
  };
  
  // 广播关闭消息
  channelMap.forEach((clients) => {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(closeWebsocket));
        client.send(JSON.stringify(closeBroadcast));
      }
    });
  });
  
  // 等待3秒后关闭连接
  setTimeout(() => {
    channelMap.forEach((clients) => {
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.close(1001, 'Server is shutting down');
        }
      });
    });
    
    let closedCount = 0;
    servers.forEach((server) => {
      server.close(() => {
        closedCount++;
        if (closedCount === servers.length) {
          logger.info('所有服务器已关闭');
          process.exit(0);
        }
      });
    });
    
    setTimeout(() => {
      logger.error('强制终止服务器（超时）');
      process.exit(1);
    }, 5000);
  }, 3000);
});