# Echo-Live WebSocket Server

这是一个适用于 [Echo-Live](https://github.com/sheep-realms/Echo-Live) 的简易 WebSocket 服务器。

## 使用方法

### 安装和运行服务器

1. 前往 [releases](https://github.com/sheep-realms/Echo-Live-WebSocket-Server/releases) 列表下载文件。
2. 将压缩包内容解压至 Echo-Live 的文件夹中。（如果您需要使用其他设备连接，放在 Echo-Live 的文件夹中是必须的）
3. 参阅 [Echo-Live 帮助文档](https://sheep-realms.github.io/Echo-Live-Doc/custom/config/)，分别启用编辑器和 Echo-Live 的 WebSocket，默认端口为 `3000`。
4. 打开解压出来的 `Echo-Live WebSocket Server.exe`，在防火墙安全警告中勾选 “专用网络” 和 “公共网络”（如果您需要使用其他设备连接，公共网络是必须的）。这会打开一个控制台窗口，使用时请勿关闭。
5. 打开 Echo-Live 的编辑器，现在它可以通过 WebSocket 服务器发送消息了，请注意日志输出。

### 跨设备连接

1. 想要跨设备连接，您首先需要获取服务器所在的设备的局域网 IP 地址。请您自行上网搜索您的操作系统如何获取局域网 IP 地址。
2. 假设您的服务器设备的局域网 IP 地址是 `192.168.0.1`，您设置的服务器端口号是 `3000`，那么您需要编辑 Echo-Live 编辑器的配置，将编辑器的 WebSocket 连接地址改为 `ws://192.168.0.1:3000`;
3. 同理，您需要在您的另一台设备（例如手机）通过浏览器访问 `http://192.168.0.1:3000`。如果您之前的安装操作正确，您将访问到编辑器。