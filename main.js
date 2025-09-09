const express = require("express");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const winston = require("winston");
const { randomUUID } = require("crypto");
const dns = require("dns");
const { combine, timestamp, printf, colorize } = winston.format;
const os = require("os");
const net = require("net");

// 从配置文件中读取设置
const config = JSON.parse(fs.readFileSync("server_config.json"));

// 初始化 Winston 日志系统
const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    timestamp({
      format: "YYYY-MM-DD HH:mm:ss.SSS",
    }),
    printf(({ level, message, timestamp }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    // 控制台输出（带颜色）
    new winston.transports.Console({
      format: combine(
        colorize(),
        printf(({ level, message, timestamp }) => {
          return `${timestamp} [${level}] ${message}`;
        })
      ),
    }),
  ],
});

// 根据配置动态调整日志传输
if (!config.logging.consoleOutput) {
  logger.remove(winston.transports.Console);
}
if (config.logging.fileOutput) {
  logger.add(
    new winston.transports.File({
      filename: config.logging.filePath,
      format: printf(({ level, message, timestamp }) => {
        return `${timestamp} [${level.toUpperCase()}] ${message}`;
      }),
    })
  );
}

// 将相对路径转换为绝对路径
if (!path.isAbsolute(config.root)) {
  config.root = path.join(__dirname, config.root);
}
logger.debug(`静态文件根目录: ${config.root}`);

// 检查目录是否存在，如果不存在则创建
if (!fs.existsSync(config.root)) {
  logger.warn(`目录不存在，创建目录: ${config.root}`);
  fs.mkdirSync(config.root, { recursive: true });
}

function getAllIPs() {
  const interfaces = os.networkInterfaces();
  const ips = new Set();

  for (const interfaceName in interfaces) {
    for (const iface of interfaces[interfaceName]) {
      if (!iface.internal) {
        ips.add(iface.address);
      }
    }
  }
  return Array.from(ips);
}

const app = express();

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
// 中间件 - 添加详细的debug日志
app.use((req, res, next) => {
  logger.debug(`收到请求: ${req.method} ${req.originalUrl}`);
  logger.debug(`请求头: ${JSON.stringify(req.headers)}`);
  logger.debug(`请求体: ${JSON.stringify(req.body)}`);
  next();
});

// 静态文件服务中间件 - 添加日志
app.use(
  express.static(config.root, {
    setHeaders: (res, path) => {
      logger.debug(`发送静态文件: ${path}`);
    },
  })
);

// CORS 中间件 - 添加详细日志
app.use((req, res, next) => {
  logger.debug(`处理CORS请求: ${req.method} ${req.originalUrl}`);
  const origin = req.headers.origin;
  if (origin && config.origin === true) {
    logger.debug(`允许跨域请求来源: ${origin}`);
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    logger.debug(`处理OPTIONS预检请求: ${req.originalUrl}`);
    return res.sendStatus(204);
  }
  next();
});

// 路由
app.get("/", (req, res) => {
  logger.debug(`处理根路由请求，客户端IP: ${req.ip}`);
  logger.debug(`请求头: ${JSON.stringify(req.headers)}`);
  res.sendFile(path.join(config.root, config.index), (err) => {
    if (err) {
      logger.error(`发送根路由文件时出错: ${err}`);
    } else {
      logger.debug(`成功发送根路由文件: ${config.index}`);
    }
  });
});

// 添加这些路由可以少敲.html
app.get("/live", (req, res) => {
  logger.debug(`处理/live路由请求，客户端IP: ${req.ip}`);
  res.sendFile(path.join(config.root, "live.html"), (err) => {
    if (err) {
      logger.error(`发送live.html时出错: ${err}`);
    } else {
      logger.debug(`成功发送live.html`);
    }
  });
});

app.get("/settings", (req, res) => {
  logger.debug(`处理/settings路由请求，客户端IP: ${req.ip}`);
  res.sendFile(path.join(config.root, "settings.html"), (err) => {
    if (err) {
      logger.error(`发送settings.html时出错: ${err}`);
    } else {
      logger.debug(`成功发送settings.html`);
    }
  });
});

app.get("/editor", (req, res) => {
  logger.debug(`处理/editor路由请求，客户端IP: ${req.ip}`);
  res.sendFile(path.join(config.root, "editor.html"), (err) => {
    if (err) {
      logger.error(`发送editor.html时出错: ${err}`);
    } else {
      logger.debug(`成功发送editor.html`);
    }
  });
});

app.get("/history", (req, res) => {
  logger.debug(`处理/history路由请求，客户端IP: ${req.ip}`);
  res.sendFile(path.join(config.root, "history.html"), (err) => {
    if (err) {
      logger.error(`发送history.html时出错: ${err}`);
    } else {
      logger.debug(`成功发送history.html`);
    }
  });
});

app.post(config.saveEndpoint, (req, res) => {
  logger.debug(`处理API请求: ${req.method} ${req.originalUrl}`);
  logger.debug(`请求头: ${JSON.stringify(req.headers)}`);
  logger.debug(`请求体内容: ${JSON.stringify(req.body)}`);

  const { name, root, data } = req.body;
  if (!name || !root || !data) {
    const errorMsg = "保存配置失败: 请求体缺少必要字段";
    logger.debug(`验证失败: ${errorMsg}`);
    return res.status(400).json({ error: errorMsg });
  }

  try {
    if (!fs.existsSync(root)) {
      logger.debug(`目录不存在，创建目录: ${root}`);
      fs.mkdirSync(root, { recursive: true });
    }

    const filePath = path.join(root, name);
    logger.debug(`准备写入文件: ${filePath}`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    logger.debug(`文件写入成功: ${filePath}`);

    res.json({
      success: true,
      message: "配置文件保存成功",
      path: filePath,
    });
    logger.debug(
      `发送成功响应: ${JSON.stringify({
        success: true,
        message: "配置文件保存成功",
        path: filePath,
      })}`
    );
  } catch (error) {
    logger.debug(`保存配置时捕获到错误: ${error.stack || error}`);
    res.status(500).json({ error: error.message });
    logger.debug(`发送错误响应: ${JSON.stringify({ error: error.message })}`);
  }
});

// 服务器
let servers = []; // 存储所有服务器实例
const channelMap = new Map(); // 存储所有频道 {channelName: Set<clients>}

// 创建服务器并监听指定地址的函数
const createServer = (host, isFirstServer = false) => {
  const s = app.listen(config.port, host, () => {
    const addressType = host.includes(":") ? "IPv6" : "IPv4";
    logger.info(`服务器已启动 (${addressType})`);
    if (isFirstServer) {
      const ips = getAllIPs();
      if (config.host != "localhost") {
        logger.info(`静态文件服务路径: ${config.root}`);
        logger.info(
          `访问地址 (域名访问): http://${config.host}:${config.port}/`
        );
        logger.info(
          `保存API地址 (域名访问): http://${config.host}:${config.port}${config.saveEndpoint}`
        );
        logger.info(
          `WebSocket地址 (域名访问): ws://${config.host}:${config.port}${config.WebSocket}`
        );
      }
      if (config.host == "localhost") {
        for (let i = 0; i < ips.length; i++) {
          const element = ips[i];
          if (!net.isIPv6(element)) {
            logger.info(`访问地址 (IP访问): http://${element}:${config.port}/`);
            logger.info(
              `保存API地址 (IP访问): http://${element}:${config.port}${config.saveEndpoint}`
            );
            logger.info(
              `WebSocket地址 (IP访问): ws://${element}:${config.port}${config.WebSocket}`
            );
          } else {
            logger.info(
              `访问地址 (IP访问): http://[${element}]:${config.port}/`
            );
            logger.info(
              `保存API地址 (IP访问): http://[${element}]:${config.port}${config.saveEndpoint}`
            );
            logger.info(
              `WebSocket地址 (IP访问): ws://[${element}]:${config.port}${config.WebSocket}`
            );
          }
        }
      }
    }
  });

  // 为每个服务器创建独立的 WebSocket 服务器
  const wss = new WebSocket.Server({
    server: s,
    verifyClient: (info, done) => {
      const wsPath = config.WebSocket;
      const normalizedUrl = info.req.url.endsWith("/")
        ? info.req.url.slice(0, -1)
        : info.req.url;

      // 精确匹配基础路径（如 /ws）
      if (normalizedUrl === wsPath) {
        return done(true);
      }

      // 匹配基础路径+频道名（如 /ws/channel1）
      if (normalizedUrl.startsWith(wsPath + "/")) {
        const channelPart = normalizedUrl.substring(wsPath.length + 1);
        if (channelPart && !channelPart.includes("/")) {
          return done(true);
        }
      }

      logger.warn(`拒绝WebSocket连接: 无效路径 ${info.req.url}`);
      return done(false, 404, "Not Found");
    },
  });

  // 主服务器处理连接
  wss.on("connection", (ws, req) => {
    logger.info(`新的WebSocket连接，客户端地址: ${req.socket.remoteAddress}`);

    // 规范化路径（移除末尾的 /）
    const normalizedUrl = req.url.endsWith("/")
      ? req.url.slice(0, -1)
      : req.url;

    // 解析频道名
    const pathWithoutBase = normalizedUrl.substring(config.WebSocket.length);
    const channelName = pathWithoutBase.split("/")[1] || "global"; // 默认为 global 频道

    // 如果频道不存在则创建
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

    ws.on("pong", () => {
      logger.debug(`收到客户端 Pong 响应，频道: ${channelName}`);
    });

    ws.on("message", (message) => {
      try {
        const parsedMsg = JSON.parse(message);
        logger.debug(
          `收到WebSocket消息，频道: ${channelName}, 消息: ${message}`
        );

        if (!parsedMsg || !parsedMsg.from || !parsedMsg.data) {
          logger.warn(`收到格式不正确的消息: ${message}`);
          return;
        }

        // 处理不同类型的消息
        switch (parsedMsg.from.type) {
          case "live":
            if (
              parsedMsg.action === "hello" &&
              parsedMsg.target === undefined
            ) {
              logger.info(
                `对话框加入服务器, UUID: ${parsedMsg.from.uuid}, 频道: ${channelName}`
              );
            } else if (
              parsedMsg.action === "close" &&
              parsedMsg.target === undefined
            ) {
              logger.info(
                `对话框离开服务器, UUID: ${parsedMsg.from.uuid}, 频道: ${channelName}`
              );
            }
            break;
          case "history":
            if (
              parsedMsg.action === "hello" &&
              parsedMsg.target === undefined
            ) {
              logger.info(
                `历史记录浏览器加入服务器, UUID: ${parsedMsg.from.uuid}, 频道: ${channelName}`
              );
            } else if (
              parsedMsg.action === "close" &&
              parsedMsg.target === undefined
            ) {
              logger.info(
                `历史记录浏览器离开服务器, UUID: ${parsedMsg.from.uuid}, 频道: ${channelName}`
              );
            }
            break;
          case "server":
            if (parsedMsg.action === "ping" && parsedMsg.target === undefined) {
              logger.info(
                `编辑器加入服务器, UUID: ${parsedMsg.from.uuid}, 频道: ${channelName}`
              );
            }
            break;
          default:
            logger.warn(
              `收到未定义类型的消息: ${parsedMsg.from.type}, 频道: ${channelName}, 原始: ${message}`
            );
            break;
        }

        // 广播逻辑
        if (channelName === "global") {
          // 如果是global频道，广播到所有频道
          channelMap.forEach((clients, name) => {
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
        logger.error(
          `处理WebSocket消息时出错: ${error}, 频道: ${channelName}, 原始消息: ${message}`
        );
      }
    });

    ws.on("close", () => {
      logger.info(`WebSocket客户端断开连接，频道: ${channelName}`);
      clearInterval(pingInterval);
      channelClients.delete(ws);
      // 如果频道没有客户端了，清理频道
      if (channelClients.size === 0) {
        channelMap.delete(channelName);
      }
    });

    ws.on("error", (error) => {
      logger.error(
        `WebSocket错误，频道: ${channelName}: ${error.stack || error}`
      );
    });
  });

  return s;
};

// 启动服务器
const startServers = () => {
  if (config.host.toLowerCase() === "localhost") {
    // 绑定所有可用地址
    const addresses = ["0.0.0.0"]; // IPv4
    if (config.ipv6Support) {
      addresses.push("::"); // IPv6
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
    // 解析主机名并启动服务器
    dns.lookup(config.host, { all: true }, (err, addresses) => {
      if (err) {
        logger.error(`DNS解析错误: ${err}`);
        process.exit(1);
      }

      // 去重地址（可能同时有IPv4和IPv6）
      const uniqueAddresses = [
        ...new Set(addresses.map((addr) => addr.address)),
      ];

      // 根据配置过滤地址
      const filteredAddresses = config.ipv6Support
        ? uniqueAddresses
        : uniqueAddresses.filter((addr) => !addr.includes(":"));

      filteredAddresses.forEach((host, index) => {
        try {
          servers.push(createServer(host, index === 0));
          logger.info(`正在监听地址: ${host}`);
        } catch (error) {
          logger.error(`无法监听地址 ${host}: ${error}`);
        }
      });

      if (servers.length === 0) {
        logger.error("没有可用的监听地址");
        process.exit(1);
      }
    });
  }
};

startServers();

// 错误处理
app.use((req, res) => {
  logger.warn(`404错误: 请求路径 ${req.path} 不存在`);
  res.status(404).send("404 Not Found");
});

process.on("SIGINT", () => {
  logger.info("服务器正在关闭...");

  const uuid = "server-" + randomUUID();

  // 1. 发送关闭广播（通知所有频道的所有客户端）
  const closeWebsocket = {
    action: "websocket_close",
    target: undefined,
    from: {
      name: "@__ws_server",
      uuid: uuid,
      type: "server",
      timestamp: Date.now(),
    },
    data: {},
  };
  const closeBroadcast = {
    action: "broadcast_close",
    from: {
      name: "@__ws_server",
      uuid: uuid,
      type: "server",
      timestamp: Date.now(),
    },
    data: {},
  };

  // 广播给所有频道的所有客户端
  channelMap.forEach((clients) => {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(closeWebsocket));
        client.send(JSON.stringify(closeBroadcast));
      }
    });
  });

  // 2. 关闭所有服务器
  // 等待 3 秒让客户端处理关闭广播
  setTimeout(() => {
    // 关闭所有WebSocket连接
    channelMap.forEach((clients) => {
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.close(1001, "Server is shutting down");
        }
      });
    });

    // 关闭所有HTTP服务器
    let closedCount = 0;
    servers.forEach((server) => {
      server.close(() => {
        closedCount++;
        if (closedCount === servers.length) {
          logger.info("所有服务器已关闭");
          process.exit(0);
        }
      });
    });

    // 超时处理
    setTimeout(() => {
      logger.error("强制终止服务器（超时）");
      process.exit(1);
    }, 5000);
  }, 3000);
});
