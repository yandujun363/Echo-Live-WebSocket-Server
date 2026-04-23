import logger from '../logger.js';

export function handleMessage(ws, message, channelName, channelClients, channelMap) {
  try {
    const parsedMsg = JSON.parse(message);
    logger.debug(`收到WebSocket消息，频道: ${channelName}, 消息: ${message}`);

    if (!parsedMsg || !parsedMsg.from || !parsedMsg.data) {
      logger.warn(`收到格式不正确的消息: ${message}`);
      return;
    }

    // 处理不同类型的消息
    switch (parsedMsg.from.type) {
      case 'live':
        if (parsedMsg.action === 'hello' && parsedMsg.target === undefined) {
          logger.info(`对话框加入服务器, UUID: ${parsedMsg.from.uuid}, 频道: ${channelName}`);
        } else if (parsedMsg.action === 'close' && parsedMsg.target === undefined) {
          logger.info(`对话框离开服务器, UUID: ${parsedMsg.from.uuid}, 频道: ${channelName}`);
        }
        break;
      case 'history':
        if (parsedMsg.action === 'hello' && parsedMsg.target === undefined) {
          logger.info(`历史记录浏览器加入服务器, UUID: ${parsedMsg.from.uuid}, 频道: ${channelName}`);
        } else if (parsedMsg.action === 'close' && parsedMsg.target === undefined) {
          logger.info(`历史记录浏览器离开服务器, UUID: ${parsedMsg.from.uuid}, 频道: ${channelName}`);
        }
        break;
      case 'server':
        if (parsedMsg.action === 'ping' && parsedMsg.target === undefined) {
          logger.info(`编辑器加入服务器, UUID: ${parsedMsg.from.uuid}, 频道: ${channelName}`);
        }
        break;
      default:
        logger.warn(`收到未定义类型的消息: ${parsedMsg.from.type}, 频道: ${channelName}, 原始: ${message}`);
        break;
    }

    // 广播逻辑
    if (channelName === 'global') {
      // 如果是global频道，广播到所有频道
      channelMap.forEach((clients) => {
        clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(parsedMsg));
          }
        });
      });
    } else {
      // 否则只广播到当前频道
      channelClients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(parsedMsg));
        }
      });
    }
  } catch (error) {
    logger.error(`处理WebSocket消息时出错: ${error}, 频道: ${channelName}, 原始消息: ${message}`);
  }
}