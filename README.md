# Echo-Live WebSocket Server

这是一个适用于 [Echo-Live](https://github.com/sheep-realms/Echo-Live) 的简易 WebSocket 服务器。

## 支持情况

该项目的预编译二进制版本支持 win-x64 linux-x64 linux-arm64 三个平台。  
如果需要在其它平台使用，请直接使用运行源码的方式。

该软件支持 Echo-Live 1.5.5 及以后版本。

## 使用方法

### 安装和运行服务器

#### 从预编译二进制版本安装
前往[Releases](https://github.com/yandujun363/Echo-Live-WebSocket-Server/releases)按照自己的系统下载对应的版本和配置文件，把配置文件放到和二进制文件相同的目录下，修改配置文件的`root`字段为`Echo-Live`的根目录，然后运行二进制文件即可。  
Windows 用户需要注意路径转义问题，即`root`字段中的路径需要使用双反斜杠`\\`而不是单反斜杠`\`。

#### 从源码安装
1.clone项目到本地
```bash
git clone https://github.com/yandujun363/Echo-Live-WebSocket-Server.git
```
2.安装依赖
```bash
mpm install
```
3.修改配置文件的`root`字段为`Echo-Live`的根目录，Windows 用户需要注意路径转义问题，即`root`字段中的路径需要使用双反斜杠`\\`而不是单反斜杠`\`。  
4.运行服务器
```bash
node main.js
```

#### 配置文件解析
```json5
{
    "host": "localhost", //监听地址设置，localhost则是监听全部地址，如果是域名，则监听域名解析的地址，如果是IP则监听IP地址
    "port": 3000, //监听端口，如果被占用可以更换为其它端口
    "ipv6Support": true, //IPv6支持，为true时会监听IPv6地址，为false不会
    "root": "Echo-Live", //服务的根目录，填写Echo-Live所在的位置，比如/www/Echo-Live，win系统要这样写：D:\\Echo-Live，注意转义
    "index": "editor.html", //访问/目录返回的界面
    "WebSocket": "/ws", //WebSocket 连接的基础路径，客户端通过这个路径建立 WebSocket 连接，支持多频道：/ws/channel1， /ws/channel2 等，默认 "global" 频道会广播到所有频道
    "saveEndpoint": "/api/save", //文件保存 API 的端点路径，客户端通过 POST 请求到这个路径保存配置数据
    "origin": true, //跨域支持，开启之后允许跨域
    "logging": {
        "level": "info", //日志等级 
        "consoleOutput": true, //是否在控制台输出日志
        "fileOutput": false, //是否把日志输出到文件
        "filePath": "Echo-Live-WebSocket-Server.log" //日志文件路径
    }
}
```

#### 远程访问
如果需要远程访问，请在防火墙中打开对应端口。