# 📘 start.js 代码文档

## 📋 概述

`start.js` 是一个 Cloudflare IP 远程检测工具，提供完整的 Web 界面和 RESTful API，支持 TLS、WebSocket、CDN Trace 等多种检测功能。

新增`workers.js` 部署于Cloudflare Workers通过直接请求后端API，能批量检测IP和域名，UI基本迁移后端UI，点击IP可通过ipapi.is提供的接口查看IP质量和详细信息

**版本**: 1.0.0  
**主要功能**: Cloudflare IP 检测、地理位置查询、网络性能测试

---
## 📋使用方法
填写IP:端口 也支持域名
HOST 这里填写你搭建的cloudflare节点的域名即可
## 🎯 核心特性

### ✅ 主要功能
- **TLS/HTTPS 检测**: 验证 SSL 证书和握手能力
- **WebSocket 检测**: 测试 WebSocket 连接能力
- **CDN Trace 检测**: 查询 Cloudflare Warp 状态
- **GeoIP 查询**: IP 地理位置和 ASN 信息
- **DNS 解析**: 支持 CNAME 递归解析
- **Web 界面**: 集成地图显示和可视化结果
- **API 接口**: RESTful API，支持批量检测

### 🛡️ 安全特性
- 请求速率限制（默认 10 次/分钟）
- 响应缓存（30 秒）
- IP 格式验证
- 超时控制

---

## 📦 依赖项

### 核心依赖
```json
{
  "express": "^4.21.2",      // Web 框架
  "ws": "^8.18.3",           // WebSocket 客户端
  "axios": "^1.13.1",        // HTTP 客户端
  "maxmind": "^4.3.29"       // GeoIP 数据库
}
```

### Node.js 内置模块
- `https` - HTTPS 请求
- `tls` - TLS/SSL 连接
- `dns` - DNS 解析
- `fs` - 文件系统
- `path` - 路径处理

---

## ⚙️ 配置参数

### 服务器配置
```javascript
const PORT = parseInt(process.env.PORT) || 3000;  // 固定端口 3000
```

### 缓存和速率限制
```javascript
const CACHE_DURATION = 30000;        // 缓存 30 秒
const MAX_REQUESTS_PER_IP = 10;      // 每 IP 每分钟 10 次
const RATE_LIMIT_WINDOW = 60000;     // 速率限制窗口 60 秒
```

### 检测超时
```javascript
const TLS_TIMEOUT = 5000;           // TLS 连接超时 5 秒
const WEBSOCKET_TIMEOUT = 3000;     // WebSocket 超时 3 秒
const CDN_TRACE_TIMEOUT = 3000;     // CDN Trace 超时 3 秒
```

### 功能开关
```javascript
const DISABLE_WEBSOCKET = process.env.DISABLE_WEBSOCKET === 'true' || false;
const DISABLE_CDN_TRACE = process.env.DISABLE_CDN_TRACE === 'true' || false;
```

### 默认值
```javascript
const DEFAULT_PORT = 443;
const DEFAULT_HOST = "clpan.pages.dev";  // 默认 SNI
const DEFAULT_WS_PATH = "/";
```

### DNS 配置
```javascript
const DNS_MAX_RECURSION_DEPTH = 10;  // CNAME 最大递归深度
```

---

## 🔧 核心函数

### 1. DNS 解析

#### `resolveDomain(domain, visited, depth)`
递归解析域名，支持 CNAME 链式解析。

**参数:**
- `domain` (string): 要解析的域名
- `visited` (Set): 已访问的域名集合（防止循环）
- `depth` (number): 当前递归深度

**返回:** `Promise<string[]>` - IP 地址数组

**特性:**
- 支持 IPv4
- 支持 CNAME 递归解析
- 防循环引用
- 多解析方法回退

**示例:**
```javascript
const ips = await resolveDomain("example.com");
// ["1.2.3.4", "5.6.7.8"]
```

---

### 2. GeoIP 查询

#### `initGeoIP()`
初始化 GeoIP 数据库，自动下载缺失文件。

**特性:**
- 加载 GeoLite2-ASN.mmdb（ASN 信息）
- 加载 GeoLite2-City.mmdb（地理位置）
- 自动下载缺失数据库
- 测试查询验证

#### `downloadGeoIPDatabase(dbPath, dbName)`
下载 GeoIP 数据库文件。

**参数:**
- `dbPath` (string): 保存路径
- `dbName` (string): 数据库文件名

**返回:** `Promise<boolean>`

#### `lookupGeoIP(ip)`
查询 IP 地理位置信息。

**参数:** `ip` (string)

**返回:** `Promise<object|null>`

**返回格式:**
```javascript
{
  city: "Beijing",
  country: "CN",
  countryName: "China",
  latitude: 39.9042,
  longitude: 116.4074,
  asn: 4837,
  organization: "China Unicom"
}
```

---

### 3. TLS 检测

#### `testTLS(ip, port, host)`
通过 HTTPS 检测 TLS/SSL 连接能力。

**参数:**
- `ip` (string): IP 地址
- `port` (number): 端口（默认 443）
- `host` (string): SNI 主机名

**返回:** `Promise<boolean>`

**特性:**
- 自定义超时（5 秒）
- SNI 支持
- 允许自签名证书

**示例:**
```javascript
const success = await testTLS("1.2.3.4", 443, "example.com");
```

---

### 4. WebSocket 检测

#### `testWebSocket(ip, port, host, wsPath)`
检测 WebSocket 连接能力。

**参数:**
- `ip` (string): IP 地址
- `port` (number): 端口（默认 443）
- `host` (string): 主机头
- `wsPath` (string): WebSocket 路径（默认 "/"）

**返回:** `Promise<object>`

**返回格式:**
```javascript
{
  connected: true,
  protocol: "chat"
}
```

**特性:**
- 自定义 TLS 连接
- SNI 支持
- WSS 协议
- 超时控制

**错误处理:**
- EACCES 权限错误自动转换为友好提示
- 超时错误处理
- 连接错误分类

---

### 5. CDN Trace 检测

#### `testCDNTrace(ip, port, host)`
查询 Cloudflare CDN Trace 信息。

**参数:**
- `ip` (string): IP 地址
- `port` (number): 端口（默认 443）
- `host` (string): SNI 主机名

**返回:** `Promise<object>`

**返回格式:**
```javascript
{
  success: true,
  warp: "off",  // "on" 或 "off"
  trace: "完整的 trace 内容"
}
```

**特性:**
- 查询 `/cdn-cgi/trace` 端点
- 解析 Warp 状态
- 超时控制

---

### 6. 工具函数

#### `isIPAddress(str)`
验证是否为有效的 IP 地址。

**支持格式:**
- IPv4: `192.168.1.1`
- IPv6: `2001:0db8::1`

**返回:** `boolean`

#### `isDomain(str)`
验证是否为有效的域名。

**返回:** `boolean`

#### `checkRateLimit(ip)`
检查 IP 是否超过速率限制。

**参数:** `ip` (string)

**返回:** `boolean`

**逻辑:**
- 每个 IP 每分钟最多 10 次请求
- 使用滑动窗口算法

---

### 7. 缓存管理

#### 缓存结构
```javascript
Map<cacheKey, {
  data: object,      // 缓存的响应数据
  timestamp: number  // 缓存时间戳
}>
```

**缓存键格式:** `${ip}_${port}_${host}_${wsPath}`

**特性:**
- 30 秒缓存有效期
- 自动过期清理

---

## 🌐 API 端点

### GET /api

**查询参数:**
- `ip` (必需): IP 地址或域名（支持 IP:端口 格式）
- `port` (可选): 端口（默认 443）
- `host` (可选): SNI 主机名
- `wsPath` (可选): WebSocket 路径（默认 "/"）

**响应格式:**

**单 IP 响应:**
```json
{
  "input": "1.2.3.4",
  "port": 443,
  "ip": "1.2.3.4",
  "checks": {
    "tls_detect": true,
    "ws_real_connect": true,
    "cdn_trace": true
  },
  "latency": {
    "tls_handshake_ms": 150,
    "ws_connect_ms": 200
  },
  "geoip": {
    "city": "Beijing",
    "country": "CN",
    "countryName": "China",
    "latitude": 39.9042,
    "longitude": 116.4074,
    "asn": 4837,
    "organization": "China Unicom"
  },
  "cdn": {
    "warp": "off"
  },
  "websocket": {
    "connected": true,
    "protocol": null
  },
  "timestamp": "2025-11-02T15:00:00.000Z"
}
```

**多 IP 响应（域名解析）:**
```json
{
  "input": "example.com",
  "isDomain": true,
  "resolvedIPs": ["1.2.3.4", "5.6.7.8"],
  "port": 443,
  "results": [
    { /* IP 1 结果 */ },
    { /* IP 2 结果 */ }
  ],
  "timestamp": "2025-11-02T15:00:00.000Z"
}
```

**错误响应:**
```json
{
  "error": "错误类型",
  "message": "详细错误信息"
}
```

---

### GET /

返回 Web 界面（HTML 文件）。

**特性:**
- 响应式设计
- Leaflet 地图集成
- 实时检测结果表格
- 详细日志输出

---

### GET /health

健康检查端点。

**响应:** `200 OK`

---

## 🚀 服务器启动

### `startServer()`
启动 Express 服务器。

**流程:**
1. 初始化 Express 应用
2. 加载 GeoIP 数据库
3. 启动服务器监听指定端口
4. 注册 SIGTERM 优雅关闭处理器

**启动日志示例:**
```
✅ GeoIP ASN 数据库加载成功
✅ GeoIP City 数据库加载成功
✅ GeoIP 测试查询成功 (1.1.1.1)
✅ CF IP 检测服务已启动，端口: 3000
📡 API 端点: http://localhost:3000/api
🌐 Web 界面: http://localhost:3000/

📦 功能配置:
   WebSocket 检测: ✅ 已启用
   CDN Trace 检测: ✅ 已启用
   GeoIP 数据库: ✅ 自动加载
```

---

## 🎨 前端界面

### HTML 模板特性
- 输入表单：IP:端口、Host (SNI)
- Leaflet 地图：显示 IP 位置
- 结果表格：详细检测信息
- 实时状态更新

### JavaScript 功能
- `detectIP()`: 发起检测请求
- `updateInfo()`: 更新显示信息
- `updateMapMarker()`: 更新地图标记
- `logDetailedInfo()`: 控制台详细日志

---

## 🔍 检测流程

### 单 IP 检测流程

```
1. 参数验证
   ↓
2. 速率限制检查
   ↓
3. 缓存检查
   ↓
4. GeoIP 查询
   ↓
5. TLS 检测（开始计时）
   ↓
6. WebSocket 检测（开始计时）
   ↓
7. CDN Trace 检测
   ↓
8. 计算延迟
   ↓
9. 缓存结果
   ↓
10. 返回响应
```

### 域名批量检测流程

```
1. DNS 解析（递归）
   ↓
2. 并行检测所有 IP
   ↓
3. 聚合结果
   ↓
4. 返回响应
```

---

## ⚠️ 错误处理

### 错误类型
1. **400 Bad Request**: 参数验证失败
2. **429 Too Many Requests**: 速率限制
3. **500 Internal Server Error**: 服务器错误

### 错误消息
- 友好的中文错误提示
- 详细的错误分类
- 包含修复建议

---

## 🌍 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | 3000 | 服务器端口 |
| `DISABLE_WEBSOCKET` | false | 禁用 WebSocket 检测 |
| `DISABLE_CDN_TRACE` | false | 禁用 CDN Trace 检测 |

---

## 📊 性能特点

### 优化措施
- 并行检测多个 IP
- 结果缓存 30 秒
- 超时控制防止阻塞
- 速率限制防止滥用

### 检测超时
- TLS: 5 秒
- WebSocket: 3 秒
- CDN Trace: 3 秒

---

## 🐛 常见问题

### 1. WebSocket 检测失败
**症状:** EACCES 权限错误

**解决方案:**
```bash
DISABLE_WEBSOCKET=true
```

### 2. GeoIP 数据库缺失
**症状:** 数据库文件不存在

**解决方案:** 自动下载，无需手动操作

### 3. 端口冲突
**症状:** 无法启动服务器

**解决方案:**
```bash
PORT=8080  # 修改环境变量
```

---

## 📝 使用示例

### 命令行测试
```bash
# 检测单个 IP
curl "http://localhost:3000/api?ip=1.2.3.4&port=443&host=example.com"

# 检测域名（批量）
curl "http://localhost:3000/api?ip=example.com&port=443"

# 检测带端口的 IP
curl "http://localhost:3000/api?ip=1.2.3.4:8443&host=example.com"
```

### JavaScript 调用
```javascript
const response = await fetch('http://localhost:3000/api?ip=1.2.3.4');
const data = await response.json();
console.log(data);
```

---

## 🔐 安全注意事项

1. **速率限制**: 防止 DDoS 攻击
2. **超时控制**: 防止资源耗尽
3. **输入验证**: IP 和域名格式验证
4. **权限处理**: WebSocket 权限错误捕获

---

## 📈 监控和日志

### 日志级别
- ✅ 成功操作
- ⚠️ 警告信息
- ❌ 错误信息
- 📋 信息提示

### 关键日志
- 每个检测步骤的详细日志
- 延迟时间
- 错误分类

---

## 📚 参考资源

- [GeoIP2 数据库](https://www.maxmind.com/en/geoip2-databases)
- [Express 文档](https://expressjs.com/)
- [WebSocket 协议](https://datatracker.ietf.org/doc/html/rfc6455)
- [Cloudflare CDN Trace](https://developers.cloudflare.com/fundamentals/reference/how-cloudflare-works/)

---

## 📄 许可证

本项目遵循 MIT 许可证。

---

**生成时间**: 2025-11-02  
**版本**: 1.0.0  
**作者**: Claude Code

