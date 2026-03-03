// ==================== 初始化 ====================
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 在 ES 模块中定义 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== 动态导入依赖（在依赖检查完成后）====================
// 使用动态导入，避免在模块解析时检查依赖
const expressModule = await import("express");
const express = expressModule.default;
const wsModule = await import("ws");
const WebSocket = wsModule.default || wsModule;
const axiosModule = await import("axios");
const axios = axiosModule.default || axiosModule;
const maxmindModule = await import("maxmind");
const maxmind = maxmindModule.default || maxmindModule;

// Node.js 内置模块可以静态导入
import https from "https";
import tls from "tls";
import dns from "dns";

const dnsLookup = promisify(dns.lookup);
const dnsResolve4 = promisify(dns.resolve4);
const dnsResolveCname = promisify(dns.resolveCname);
const dnsResolve = promisify(dns.resolve);

// 异步文件操作
const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

// 检查文件是否存在（异步）
async function fileExists(filePath) {
    try {
        await access(filePath, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

// ==================== 配置参数 ====================
// 服务器配置
const PORT = parseInt(process.env.PORT) || 8888;

// 缓存和速率限制配置
const CACHE_DURATION = 30000; // 缓存持续时间（毫秒）- 30秒
const MAX_REQUESTS_PER_IP = 60; // 每个IP每分钟最大请求数
const RATE_LIMIT_WINDOW = 60000; // 速率限制时间窗口（毫秒）- 1分钟

// 检测超时配置
const TLS_TIMEOUT = 3000; // TLS/HTTPS 连接超时（毫秒）
const WEBSOCKET_TIMEOUT = 3000; // WebSocket 连接超时（毫秒）
const CDN_TRACE_TIMEOUT = 3000; // CDN Trace 请求超时（毫秒）

// 功能开关配置
const DISABLE_WEBSOCKET = process.env.DISABLE_WEBSOCKET === 'true'; // 禁用 WebSocket 检测（用于云平台）
const DISABLE_CDN_TRACE = process.env.DISABLE_CDN_TRACE === 'true'; // 禁用 CDN Trace 检测

// DNS 解析配置
const DNS_MAX_RECURSION_DEPTH = 10; // CNAME 递归解析最大深度

// 默认值配置
const DEFAULT_PORT = 443; // 默认端口
const DEFAULT_HOST = "clpan.pages.dev"; // 默认 Host (SNI)
const DEFAULT_WS_PATH = "/"; // 默认 WebSocket 路径

// 内存管理配置
const MEMORY_CHECK_INTERVAL = 300000; // 内存检查间隔（毫秒）- 5分钟
const MEMORY_CLEANUP_THRESHOLD = 200; // 内存清理阈值（MB）- 堆内存使用超过此值时触发清理
const MEMORY_CRITICAL_THRESHOLD = 280; // 内存严重阈值（MB）- 堆内存使用超过此值时强制清理
const MEMORY_CLEANUP_INTERVAL = 60000; // 内存清理间隔（毫秒）- 1分钟

// 日志配置（仅输出到控制台，不保存文件）
const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO'; // 日志级别: DEBUG, INFO, WARN, ERROR
const LOG_ENABLE_COLOR = process.platform !== 'win32' || process.env.CI !== 'true'; // 日志颜色支持
// 检测过程的详细日志（设置为false可减少日志输出）
const ENABLE_DETECTION_DEBUG = process.env.ENABLE_DETECTION_DEBUG === 'true'; // 是否显示检测过程的DEBUG日志
// 静默模式（不输出任何检测内容，只输出启动信息和严重错误）
const QUIET_MODE = process.env.QUIET_MODE === 'true'; // 静默模式：不输出检测相关日志

// ==================== 配置参数结束 ====================

// ------------------- 日志系统（仅输出到控制台，不保存文件）-------------------
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const currentLogLevel = LOG_LEVELS[LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO;

// 颜色代码（仅用于控制台输出）
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function getColor(colorName) {
  return LOG_ENABLE_COLOR ? colors[colorName] || '' : '';
}

function formatTimestamp() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 23);
}

function formatData(data) {
  if (data === null || data === undefined) return '';
  if (typeof data !== 'object') return String(data);
  
  // 格式化对象数据，使其更易读
  const entries = Object.entries(data);
  if (entries.length === 0) return '';
  
  // 对于单行显示，使用简洁格式
  const formatted = entries.map(([key, value]) => {
    if (value === null || value === undefined) return `${key}=null`;
    if (typeof value === 'object') return `${key}=${JSON.stringify(value)}`;
    return `${key}=${value}`;
  }).join(', ');
  
  return `{ ${formatted} }`;
}

function log(level, message, data = null) {
  const levelNum = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  if (levelNum < currentLogLevel) return;

  const timestamp = formatTimestamp();
  let color = '';
  let prefix = '';

  switch (level) {
    case 'DEBUG':
      color = getColor('dim');
      prefix = 'DEBUG';
      break;
    case 'INFO':
      color = getColor('cyan');
      prefix = 'INFO ';
      break;
    case 'WARN':
      color = getColor('yellow');
      prefix = 'WARN ';
      break;
    case 'ERROR':
      color = getColor('red');
      prefix = 'ERROR';
      break;
  }

  const resetColor = getColor('reset');
  let logMessage = `${color}[${timestamp}] [${prefix}]${resetColor} ${message}`;
  
  if (data !== null && data !== undefined) {
    const formattedData = formatData(data);
    if (formattedData) {
      logMessage += ` ${formattedData}`;
    }
  }

  // 根据日志级别选择输出方法
  if (level === 'ERROR') {
    console.error(logMessage);
  } else if (level === 'WARN') {
    console.warn(logMessage);
  } else {
    console.log(logMessage);
  }
}

// 日志快捷方法
const logger = {
  debug: (msg, data) => log('DEBUG', msg, data),
  info: (msg, data) => log('INFO', msg, data),
  warn: (msg, data) => log('WARN', msg, data),
  error: (msg, data) => log('ERROR', msg, data)
};

// ------------------- 内存管理模块 --------------------
let memoryStats = {
  lastCheck: Date.now(),
  cleanupCount: 0,
  lastCleanup: Date.now(),
  peakHeapUsed: 0,
  peakRss: 0
};

function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    rss: Math.round(usage.rss / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024)
  };
}

function logMemoryUsage(context = '') {
  const mem = getMemoryUsage();
  const contextText = context ? ` ${context}` : '';
  logger.info(`内存使用${contextText}`, {
    heap: `${mem.heapUsed}/${mem.heapTotal} MB`,
    rss: `${mem.rss} MB`,
    cache: requestCache.size,
    rateLimit: rateLimitMap.size
  });

  // 更新峰值记录
  if (mem.heapUsed > memoryStats.peakHeapUsed) {
    memoryStats.peakHeapUsed = mem.heapUsed;
  }
  if (mem.rss > memoryStats.peakRss) {
    memoryStats.peakRss = mem.rss;
  }
}

function performMemoryCleanup(force = false) {
  const mem = getMemoryUsage();
  const now = Date.now();
  
  logger.info('开始内存清理', {
    heapUsed: `${mem.heapUsed} MB`,
    cacheSize: requestCache.size,
    rateLimitSize: rateLimitMap.size,
    force
  });

  let cleanedCount = 0;
  const startTime = Date.now();

  // 1. 清理过期缓存
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      requestCache.delete(key);
      cleanedCount++;
    }
  }

  // 2. 清理过期的速率限制记录
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.firstRequest > RATE_LIMIT_WINDOW * 2) {
      rateLimitMap.delete(key);
      cleanedCount++;
    }
  }

  // 3. 强制清理：如果内存使用过高，清理更多缓存
  if (force || mem.heapUsed > MEMORY_CLEANUP_THRESHOLD) {
    // 清理最旧的一半缓存
    if (requestCache.size > 500) {
      const entries = Array.from(requestCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, Math.floor(entries.length / 2));
      toDelete.forEach(([key]) => {
        requestCache.delete(key);
        cleanedCount++;
      });
    }

    // 清理最旧的速率限制记录
    if (rateLimitMap.size > 2500) {
      const entries = Array.from(rateLimitMap.entries())
        .sort((a, b) => a[1].firstRequest - b[1].firstRequest);
      const toDelete = entries.slice(0, Math.floor(entries.length / 2));
      toDelete.forEach(([key]) => {
        rateLimitMap.delete(key);
        cleanedCount++;
      });
    }
  }

  // 4. 严重内存压力：强制垃圾回收（如果可用）
  if (mem.heapUsed > MEMORY_CRITICAL_THRESHOLD && global.gc) {
    logger.warn('内存使用过高，执行强制垃圾回收', { heapUsed: `${mem.heapUsed} MB` });
    try {
      global.gc();
    } catch (err) {
      logger.error('垃圾回收失败', err.message);
    }
  }

  const duration = Date.now() - startTime;
  memoryStats.cleanupCount++;
  memoryStats.lastCleanup = now;

  const memAfter = getMemoryUsage();
  logger.info('内存清理完成', {
    cleaned: cleanedCount,
    duration: `${duration}ms`,
    heapUsedBefore: `${mem.heapUsed} MB`,
    heapUsedAfter: `${memAfter.heapUsed} MB`,
    cacheSize: requestCache.size,
    rateLimitSize: rateLimitMap.size
  });

  return cleanedCount;
}

// 定期内存检查和清理
let memoryCheckCounter = 0;
setInterval(() => {
  const mem = getMemoryUsage();
  memoryStats.lastCheck = Date.now();
  memoryCheckCounter++;

  // 每5分钟输出一次内存使用情况（每5次检查输出一次，静默模式下不输出）
  if (memoryCheckCounter % 5 === 0 && !QUIET_MODE) {
    logMemoryUsage('定期检查');
  }

  // 如果内存使用超过阈值，触发清理
  if (mem.heapUsed > MEMORY_CLEANUP_THRESHOLD) {
    logger.warn('内存使用超过阈值，触发自动清理', {
      heap: `${mem.heapUsed} MB`,
      threshold: `${MEMORY_CLEANUP_THRESHOLD} MB`
    });
    performMemoryCleanup(true);
  }

  // 严重内存压力
  if (mem.heapUsed > MEMORY_CRITICAL_THRESHOLD) {
    logger.error('内存使用严重超标，执行强制清理', {
      heap: `${mem.heapUsed} MB`,
      critical: `${MEMORY_CRITICAL_THRESHOLD} MB`
    });
    performMemoryCleanup(true);
  }
}, MEMORY_CLEANUP_INTERVAL);

const app = express();

// 中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 压缩中间件（如果可用）
try {
    const compression = await import('compression');
    app.use(compression.default());
} catch (e) {
    // compression 模块不可用，跳过
}

// 静态资源缓存和性能优化
app.use((req, res, next) => {
    // 为HTML设置缓存控制
    if (req.path === '/' || req.path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    // 为API设置缓存
    if (req.path.startsWith('/api')) {
        res.setHeader('Cache-Control', 'public, max-age=30');
    }
    next();
});

// CORS 支持
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// ------------------- HTML 前端（集成在代码中）-------------------
const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>CF IP 远程检测</title>

<link rel="icon" href="https://images.icon-icons.com/799/PNG/512/rainnyday_icon-icons.com_65778.png">
<link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />

<style>
/* ================= 原 iptest.js 样式（完整保留） ================= */
:root {
  --bg-base: #fbfbfd;
  --bg-gradient: radial-gradient(at 0% 0%, hsla(225,39%,92%,1) 0, transparent 50%),
                 radial-gradient(at 100% 0%, hsla(339,49%,92%,1) 0, transparent 50%);
  --glass: rgba(255,255,255,.65);
  --glass-border: rgba(255,255,255,.45);
  --text: #1d1d1f;
  --text-secondary: #86868b;
  --primary-grad: linear-gradient(135deg,#007aff,#5856d6);
  --primary-shadow: 0 4px 14px rgba(0,118,255,.35);
  --danger-grad: linear-gradient(135deg,#ff453a,#ff3b30);
  --active-row: rgba(0,122,255,.08);
  --input-border: rgba(0,0,0,.15);
  --green: #34c759;
}

@media(prefers-color-scheme:dark){
  :root{
    --bg-base:#000;
    --glass: rgba(30,30,40,.6);
    --glass-border: rgba(255,255,255,.1);
    --text:#f5f5f7;
    --active-row: rgba(10,132,255,.2);
    --input-border: rgba(255,255,255,.18);
  }
}

*{box-sizing:border-box}
body{
  margin:0;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;
  background:var(--bg-base);
  background-image:var(--bg-gradient);
  color:var(--text);
}

.app{
  max-width:1400px;
  margin:0 auto;
  padding:40px 28px;
  display:grid;
  gap:30px;
}

@media(min-width:900px){
  .app{grid-template-columns:380px 1fr}
}

.glass{
  background:var(--glass);
  backdrop-filter:blur(20px);
  border:1px solid var(--glass-border);
  border-radius:24px;
  padding:24px;
  box-shadow:0 8px 32px rgba(0,0,0,.08);
}

h1{
  margin:0 0 20px;
  font-size:24px;
  background:var(--primary-grad);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
}

label{
  font-size:13px;
  color:var(--text-secondary);
  margin-bottom:6px;
  display:block;
}

input,textarea{
  width:100%;
  padding:14px 16px;
  border-radius:16px;
  border:1px solid var(--input-border);
  background:rgba(255,255,255,.55);
  font-size:15px;
  transition:border-color .2s, box-shadow .2s;
}

input:focus, textarea:focus{
  outline: none;
  border-color:#0a84ff;
  box-shadow:0 0 0 4px rgba(10,132,255,.15);
}

textarea{min-height:120px;resize:vertical}

button{
  width:100%;
  padding:16px;
  border-radius:16px;
  border:none;
  font-size:16px;
  font-weight:600;
  cursor:pointer;
}

.btn-primary{
  background:var(--primary-grad);
  color:#fff;
  box-shadow:var(--primary-shadow);
  margin-top:8px;
}

.btn-primary:disabled{
  opacity:.6;
  cursor:not-allowed;
}

.btn-danger{
  margin-top:14px;
  background:var(--danger-grad);
  color:#fff;
}

#map{
  height:280px;
  border-radius:18px;
  margin-top:24px;
}

.status{
  font-size:15px;
  font-weight:600;
  margin-bottom:16px;
}

table{
  width:100%;
  border-collapse:separate;
  border-spacing:0 6px;
  font-size:13px;
}

th{
  text-align:left;
  padding:12px;
  font-size:12px;
  color:var(--text-secondary);
}

td{
  padding:14px 12px;
  background:rgba(255,255,255,.03);
}

tr.active{background:var(--active-row)}

td.ip-cell{
  font-weight:600;
  cursor:pointer;
  color:#007aff;
  font-family:"SF Mono",monospace;
}

.badge{
  padding:4px 10px;
  border-radius:999px;
  font-size:11px;
  font-weight:700;
  color:#fff;
}

.ok{background:linear-gradient(135deg,#34c759,#30b350)}
.fail{background:linear-gradient(135deg,#ff3b30,#ff2d55)}

.mobile-list{display:none}

@media(max-width:899px){
  table{display:none}
  .mobile-list{display:grid;gap:12px}
  .mobile-item{
    padding:16px;
    border-radius:16px;
    background:rgba(255,255,255,.08);
    cursor:pointer;
  }
  .mobile-item.active{background:var(--active-row)}
}

/* ================= 优化后的 IP 详细信息卡片样式 ================= */
.ip-detail-card{
  position:fixed;
  right:20px;
  bottom:20px;
  width:min(480px,96vw);
  height:85vh;
  background:var(--glass);
  backdrop-filter:blur(22px);
  border:1px solid var(--glass-border);
  border-radius:26px;
  box-shadow:0 30px 70px rgba(0,0,0,.28);
  z-index:9999;
  display:none;
  flex-direction: column;
  overflow: hidden;
}

@media(max-width:768px){
  .ip-detail-card{
    right:50%;
    transform:translateX(50%);
    bottom:10px;
    width: 95vw;
  }
}

.ip-detail-header{
  padding: 16px 24px;
  font-size: 18px;
  font-weight: 700;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.ip-detail-header .title {
  background: var(--primary-grad);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.ip-detail-body{
  padding: 8px 24px 24px;
  overflow-y: auto;
  flex-grow: 1;
}

.ip-detail-body::-webkit-scrollbar { width: 5px; }
.ip-detail-body::-webkit-scrollbar-track { background: transparent; }
.ip-detail-body::-webkit-scrollbar-thumb { background: rgba(120, 120, 120, .4); border-radius: 3px; }

.section { margin-top: 20px; }
.section-title {
  font-weight: 600;
  margin-bottom: 10px;
  font-size: 14px;
  color: var(--text-secondary);
}

.kv {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 12px 14px;
  padding: 16px;
  background: rgba(0,0,0,0.03);
  border-radius: 14px;
  font-size: 14px;
}
@media(prefers-color-scheme:dark){
  .kv { background: rgba(255,255,255,0.05); }
}

.kv .k { color:var(--text-secondary); }
.kv .v { font-weight: 500; word-break: break-all; }
.text-green { color: var(--green); font-weight: 600; }

.score-box{
  margin-top:8px;
  padding:14px 16px;
  border-radius:14px;
  font-weight:600;
  color:#fff;
  font-size: 15px;
}

.close{
  cursor:pointer;
  font-size:24px;
  font-weight: 400;
  color: var(--text-secondary);
  transition: color .2s;
}
.close:hover { color: var(--text); }
</style>
</head>

<body>

<div class="app">
  <div class="glass">
    <h1>CF IP 远程检测</h1>
    <label style="margin-top:12px">IP / 域名（支持多行）</label>
    <textarea id="inputs"></textarea>
    <label style="margin-top:12px">Host (SNI，可选)</label>
    <input id="host">
    <button id="startBtn" class="btn-primary">开始检测</button>
    <button id="clearBtn" class="btn-danger">清除面板</button>
    <div id="map"></div>
  </div>

  <div class="glass">
    <div id="status" class="status">等待检测</div>
    <table>
      <thead>
        <tr>
          <th>来源</th><th>IP</th><th>位置</th><th>ASN</th>
          <th>TLS</th><th>WS</th><th>CDN</th>
          <th>TLS ms</th><th>WS ms</th><th>Warp</th>
        </tr>
      </thead>
      <tbody id="tableBody"></tbody>
    </table>
    <div id="mobileList" class="mobile-list"></div>
  </div>
</div>

<div id="ipDetailCard" class="ip-detail-card">
  <div class="ip-detail-header">
    <span class="title">🔍 IP 详细信息</span>
    <span class="close" onclick="closeIPDetail()">×</span>
  </div>
  <div id="ipDetailBody" class="ip-detail-body"></div>
</div>

<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script>
/* ================= 原 iptest.js JS ================= */
const inputsEl  = document.getElementById("inputs");
const hostEl    = document.getElementById("host");
const tableBody = document.getElementById("tableBody");
const mobileList= document.getElementById("mobileList");
const statusEl  = document.getElementById("status");
const startBtn  = document.getElementById("startBtn");
const clearBtn  = document.getElementById("clearBtn");

let map = L.map("map").setView([20,0],2);
L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}").addTo(map);
let marker=null, activeIP=null;

let isDetecting=false;
const cache=new Map();
const MAX_CONCURRENT=3;
const REQUEST_INTERVAL_MS=300;
const RETRY_STATUSES = new Set([403, 429]);
const MAX_RETRIES = 2;
let allResults=[];

const ipapiCache=new Map();

function setDetecting(state){
  isDetecting=state;
  startBtn.disabled=state;
  startBtn.textContent = state ? "检测中…" : "开始检测";
}

function clearPanel(internal=false){
  cache.clear();
  allResults=[];
  tableBody.innerHTML="";
  mobileList.innerHTML="";
  statusEl.textContent= internal ? "准备检测…" : "已清除结果";
  activeIP=null;
  if(marker){map.removeLayer(marker);marker=null;}
  if(!internal) setDetecting(false);
}

function parseInputs(){
  return [...new Set(inputsEl.value.split(/[\\n,]/).map(v=>v.trim()).filter(Boolean))];
}

function calcScore(r){
  return (r.checks?.tls_detect?1:0)
       + (r.checks?.ws_real_connect?1:0)
       + (r.checks?.cdn_trace?1:0);
}

function sortResults(){
  allResults.sort((a,b)=>{
    const d=calcScore(b)-calcScore(a);
    return d!==0 ? d : a._order-b._order;
  });
}

function renderAll(){
  sortResults();
  tableBody.innerHTML="";
  mobileList.innerHTML="";
  allResults.forEach(renderOne);
}

function startDetect(){
  if(isDetecting) return;

  const targets=parseInputs();
  if(!targets.length) return;

  clearPanel(true);
  setDetecting(true);
  statusEl.textContent=\`⏳ 正在检测（0 / \${targets.length}）\`;

  let finished=0,running=0;
  const currentConcurrent = targets.length > 1 ? 1 : MAX_CONCURRENT;
  let queue=[...targets], order=0;

  async function next(){
    if(!queue.length && running === 0) {
        statusEl.textContent=\`✅ 检测完成（\${targets.length} 项）\`;
        setDetecting(false);
        return;
    }
    while(running < currentConcurrent && queue.length > 0){
        running++;
        const target=queue.shift();
        try{
          const list=await detectOne(target);
          list.forEach(r=>{
            r._order=order++;
            r._source=target;
            allResults.push(r);
          });
          renderAll();
          await sleep(REQUEST_INTERVAL_MS);
        } catch(e) {
          console.error('Detection failed for', target, e);
        } finally {
          finished++;
          running--;
          statusEl.textContent=\`⏳ 正在检测（\${finished} / \${targets.length}）\`;
          next();
        }
    }
  }

  for(let i=0;i<currentConcurrent;i++) next();
}

function sleep(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function requestWithRetry(url, retries = MAX_RETRIES){
  for(let attempt=0; attempt<=retries; attempt++){
    const res=await fetch(url);
    if(res.ok) return res;

    if(!RETRY_STATUSES.has(res.status) || attempt===retries){
      throw new Error(\`HTTP \${res.status}\`);
    }

    await sleep(500 * (attempt + 1));
  }

  throw new Error("request failed");
}

async function detectOne(target){
  const key=\`\${target}|\${hostEl.value}\`;
  if(cache.has(key)) return cache.get(key);
  
  const params=new URLSearchParams({ip:target});
  if(hostEl.value.trim()) params.append("host",hostEl.value.trim());
  
  const res=await requestWithRetry("/api?"+params);
  
  const data=await res.json();
  const list=data.results||[data];
  cache.set(key,list);
  return list;
}

function renderOne(r){
  const tr=document.createElement("tr");
  tr.dataset.ip=r.ip;
  tr.innerHTML=\`
    <td>\${r._source}</td>
    <td class="ip-cell">\${r.ip}</td>
    <td>\${r.geoip?.city||''} \${r.geoip?.countryName||''}</td>
    <td>\${r.geoip?.organization||'-'}</td>
    <td><span class="badge \${r.checks.tls_detect?'ok':'fail'}">\${r.checks.tls_detect?'✓':'✕'}</span></td>
    <td><span class="badge \${r.checks.ws_real_connect?'ok':'fail'}">\${r.checks.ws_real_connect?'✓':'✕'}</span></td>
    <td><span class="badge \${r.checks.cdn_trace?'ok':'fail'}">\${r.checks.cdn_trace?'✓':'✕'}</span></td>
    <td>\${r.latency?.tls_handshake_ms||'-'}</td>
    <td>\${r.latency?.ws_connect_ms||'-'}</td>
    <td>\${r.cdn?.warp||'off'}</td>\`;
  tr.querySelector(".ip-cell").onclick=()=>focusIP(r);
  tableBody.appendChild(tr);

  const div=document.createElement("div");
  div.className="mobile-item";
  div.dataset.ip = r.ip;
  div.onclick=()=>focusIP(r);
  div.innerHTML=\`
    <strong>\${r.ip}</strong><br>
    <small>来源：\${r._source}</small><br>
    <span class="badge \${r.checks.tls_detect?'ok':'fail'}">TLS</span>
    <span class="badge \${r.checks.ws_real_connect?'ok':'fail'}">WS</span>
    <span class="badge \${r.checks.cdn_trace?'ok':'fail'}">CDN</span>\`;
  mobileList.appendChild(div);
}

/* ================= IP 详细信息展示逻辑 ================= */

function parseAbuseScore(v){
  if(!v) return 0;
  if(typeof v==="number") return v;
  const m=String(v).match(/[\d.]+/);
  return m?parseFloat(m[0]):0;
}

function riskColor(score){
  if(score<0.5) return "#146c43";
  if(score<1)   return "#1f9d55";
  if(score<3)   return "#84cc16";
  if(score<8)   return "#adbe13";
  if(score<15)  return "#facc15";
  if(score<25)  return "#f97316";
  if(score<40)  return "#e45a25";
  if(score<60)  return "#dc3545";
  return "#c81e1e";
}

function getRiskLevel(score){
  if(score<0.5) return "极度纯净";
  if(score<1) return "纯净";
  if(score<3) return "可信";
  if(score<8) return "轻微风险";
  if(score<15) return "风险";
  if(score<25) return "中度风险";
  if(score<40) return "高风险";
  if(score<60) return "严重风险";
  return "极度风险";
}

async function showIPDetail(ip){
  const card=document.getElementById("ipDetailCard");
  const body=document.getElementById("ipDetailBody");
  card.style.display="flex";
  body.innerHTML="加载中…";

  let d;
  try {
    if(ipapiCache.has(ip)){
      d=ipapiCache.get(ip);
    }else{
      // 修复点：添加 referrerPolicy: 'no-referrer' 
      // 防止因为来源是 Worker 代理域名而被 API 拒绝
      const response = await fetch("https://api.ipapi.is/?q="+ip, {
        referrerPolicy: "no-referrer"
      });
      
      if (!response.ok) throw new Error(\`API Error \${response.status}\`);
      d = await response.json();
      ipapiCache.set(ip,d);
    }

    const companyScore=parseAbuseScore(d.company?.abuser_score);
    const asnScore=parseAbuseScore(d.asn?.abuser_score);
    const base=((companyScore+asnScore)/2)*5;
    const flags=["is_crawler","is_proxy","is_vpn","is_tor","is_abuser","is_bogon"];
    const riskCount=flags.filter(f=>!!d[f]).length;
    const score=Math.min(100,base*(1+riskCount*0.15)*100);

    const crawlerVal=d.is_crawler===false?"否":(typeof d.is_crawler==="string"?d.is_crawler:"是");

    const typeMap = {
        hosting: '机房', education: '教育', government: '政府',
        banking: '金融', business: '商用', isp: '住宅'
    };
    const formatType = (type) => {
        const mapped = typeMap[type] || type;
        if (mapped === '住宅') {
            return '<span class="text-green">住宅</span>';
        }
        return mapped || 'N/A';
    };
    
    const companyTypeFormatted = formatType(d.company?.type);
    const asnTypeFormatted = formatType(d.asn?.type);
    const combinedType = d.company?.type === d.asn?.type 
      ? companyTypeFormatted 
      : \`\${companyTypeFormatted} / \${asnTypeFormatted}\`;

    body.innerHTML=\`
<div class="section">
  <div class="section-title">基本信息</div>
  <div class="kv">
    <div class="k">IP 地址</div><div class="v">\${d.ip || 'N/A'}</div>
    <div class="k">国家</div><div class="v">\${d.location?.country || 'N/A'} (\${d.location?.country_code || 'N/A'})</div>
    <div class="k">区域互联网注册机构</div><div class="v">\${d.rir || 'N/A'}</div>
    <div class="k">运营商 / ASN 类型</div><div class="v">\${combinedType}</div>
  </div>
  <div class="score-box" style="background:\${riskColor(score)}">
    综合滥用评分：\${score.toFixed(2)}% · \${getRiskLevel(score)}
  </div>
</div>

<div class="section">
  <div class="section-title">安全检测</div>
  <div class="kv">
    <div class="k">移动网络</div><div class="v">\${d.is_mobile?"是":"否"}</div>
    <div class="k">数据中心</div><div class="v">\${d.is_datacenter?"是":"否"}</div>
    <div class="k">卫星网络</div><div class="v">\${d.is_satellite?"是":"否"}</div>
    <div class="k">爬虫</div><div class="v">\${crawlerVal}</div>
    <div class="k">代理服务器</div><div class="v">\${d.is_proxy?"是":"否"}</div>
    <div class="k">VPN</div><div class="v">\${d.is_vpn?"是":"否"}</div>
    <div class="k">Tor 网络</div><div class="v">\${d.is_tor?"是":"否"}</div>
    <div class="k">滥用 IP</div><div class="v">\${d.is_abuser?"是":"否"}</div>
    <div class="k">虚假 IP</div><div class="v">\${d.is_bogon?"是":"否"}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">位置信息</div>
  <div class="kv">
    <div class="k">国家</div><div class="v">\${d.location?.country || 'N/A'} (\${d.location?.country_code || 'N/A'})</div>
    <div class="k">省份/州</div><div class="v">\${d.location?.state || 'N/A'}</div>
    <div class="k">城市</div><div class="v">\${d.location?.city || 'N/A'}</div>
    <div class="k">邮编</div><div class="v">\${d.location?.zip || 'N/A'}</div>
    <div class="k">坐标</div><div class="v">\${d.location?.latitude ? \`\${d.location.latitude}, \${d.location.longitude}\` : 'N/A'}</div>
    <div class="k">时区</div><div class="v">\${d.location?.timezone || 'N/A'}</div>
    <div class="k">当地时间</div><div class="v">\${d.location?.local_time || 'N/A'}</div>
    <div class="k">欧盟成员</div><div class="v">\${d.location?.is_eu_member?"是":"否"}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">运营商信息</div>
  <div class="kv">
    <div class="k">运营商名称</div><div class="v">\${d.company?.name || 'N/A'}</div>
    <div class="k">域名</div><div class="v">\${d.company?.domain || 'N/A'}</div>
    <div class="k">类型</div><div class="v">\${companyTypeFormatted}</div>
    <div class="k">网络范围</div><div class="v">\${d.company?.network || 'N/A'}</div>
    <div class="k">滥用评分</div><div class="v">\${d.company?.abuser_score ?? 'N/A'}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">ASN 信息</div>
  <div class="kv">
    <div class="k">ASN 编号</div><div class="v">AS\${d.asn?.asn || 'N/A'}</div>
    <div class="k">组织</div><div class="v">\${d.asn?.org || 'N/A'}</div>
    <div class="k">路由</div><div class="v">\${d.asn?.route || 'N/A'}</div>
    <div class="k">类型</div><div class="v">\${asnTypeFormatted}</div>
    <div class="k">滥用评分</div><div class="v">\${d.asn?.abuser_score ?? 'N/A'}</div>
    <div class="k">国家代码</div><div class="v">\${d.asn?.country?.toUpperCase() || 'N/A'}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">滥用举报联系方式</div>
  <div class="kv">
    <div class="k">联系人</div><div class="v">\${d.abuse?.name || 'N/A'}</div>
    <div class="k">邮箱</div><div class="v">\${d.abuse?.email || 'N/A'}</div>
    <div class="k">电话</div><div class="v">\${d.abuse?.phone || 'N/A'}</div>
    <div class="k">地址</div><div class="v">\${d.abuse?.address || 'N/A'}</div>
  </div>
</div>
\`;
  } catch (error) {
    body.innerHTML = \`加载 IP[\${ip}] 详细信息失败。<br>错误: \${error.message}\`;
    console.error("Failed to fetch IP details:", error);
  }
}

function closeIPDetail(){
  document.getElementById("ipDetailCard").style.display="none";
  if(activeIP){
    document.querySelectorAll(\`[data-ip="\${activeIP}"]\`).forEach(el=>el.classList.remove('active'));
    activeIP = null;
  }
}

function focusIP(r){
  if(!r.geoip?.latitude) return;

  if(activeIP){
    document.querySelectorAll(\`[data-ip="\${activeIP}"]\`).forEach(el=>el.classList.remove('active'));
  }
  
  activeIP=r.ip;
  document.querySelectorAll(\`[data-ip="\${activeIP}"]\`).forEach(el=>el.classList.add('active'));

  marker && map.removeLayer(marker);
  marker=L.marker([r.geoip.latitude,r.geoip.longitude]).addTo(map).bindPopup(r.ip).openPopup();
  map.setView([r.geoip.latitude,r.geoip.longitude],6);
  showIPDetail(r.ip);
}

startBtn.onclick=startDetect;
clearBtn.onclick=()=>clearPanel(false);
</script>
</body>
</html>`;
// 根路径返回 HTML
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.send(HTML_TEMPLATE);
});

// 处理 favicon.ico 请求（避免 404 错误）
app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

// 健康检查端点
app.get("/health", (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + " MB"
    },
    cache: {
      size: requestCache.size,
      rateLimitSize: rateLimitMap.size
    },
    geoip: {
      asn: asnReader !== null,
      city: cityReader !== null
    },
    features: {
      websocket: !DISABLE_WEBSOCKET,
      cdnTrace: !DISABLE_CDN_TRACE
    }
  });
});

// 统计信息端点
app.get("/stats", (req, res) => {
  const memoryUsage = process.memoryUsage();
  const cacheEntries = Array.from(requestCache.entries());
  const recentRequests = cacheEntries
    .sort((a, b) => b[1].timestamp - a[1].timestamp)
    .slice(0, 10)
    .map(([key, value]) => ({
      key,
      timestamp: new Date(value.timestamp).toISOString(),
      age: Math.round((Date.now() - value.timestamp) / 1000) + "s"
    }));
  
  res.json({
    server: {
      uptime: process.uptime(),
      uptimeFormatted: formatUptime(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform
    },
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    },
    cache: {
      size: requestCache.size,
      rateLimitSize: rateLimitMap.size,
      recentRequests
    },
    geoip: {
      asnLoaded: asnReader !== null,
      cityLoaded: cityReader !== null
    },
    config: {
      port: PORT,
      cacheDuration: CACHE_DURATION / 1000 + "s",
      maxRequestsPerIP: MAX_REQUESTS_PER_IP,
      rateLimitWindow: RATE_LIMIT_WINDOW / 1000 + "s",
      tlsTimeout: TLS_TIMEOUT,
      wsTimeout: WEBSOCKET_TIMEOUT,
      cdnTraceTimeout: CDN_TRACE_TIMEOUT,
      disableWebSocket: DISABLE_WEBSOCKET,
      disableCdnTrace: DISABLE_CDN_TRACE
    }
  });
});

// 格式化运行时间
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

// ------------------- 初始化 GeoIP 数据库 -------------------
let cityReader = null;
let asnReader = null;

async function downloadGeoIPDatabase(dbPath, dbName) {
  const downloadUrls = [
    'https://raw.gitmirror.com/adysec/IP_database/main/geolite/' + dbName,
    'https://raw.githubusercontent.com/adysec/IP_database/main/geolite/' + dbName
  ];
  
  for (const downloadUrl of downloadUrls) {
    try {
      logger.info(`尝试下载 GeoIP 数据库`, { url: downloadUrl, dbName });
      const response = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
        maxContentLength: 100 * 1024 * 1024 // 最大 100MB
      });
      
      await fs.promises.writeFile(dbPath, response.data);
      const fileSize = (response.data.length / 1024 / 1024).toFixed(2);
      logger.info(`${dbName} 下载成功`, { path: dbPath, size: `${fileSize} MB` });
      return true;
    } catch (urlError) {
      logger.warn(`下载失败`, { url: downloadUrl, error: urlError.message });
    }
  }
  
  return false;
}

async function initGeoIP() {
  try {
    // 加载 ASN 数据库（使用 maxmind.Reader 方式）
    const asnDbPath = path.join(__dirname, "GeoLite2-ASN.mmdb");
    if (await fileExists(asnDbPath)) {
      try {
        const buffer = await readFile(asnDbPath);
        asnReader = new maxmind.Reader(buffer, { watch: false });
        logger.info("GeoIP ASN 数据库加载成功");
      } catch (err) {
        logger.warn("GeoIP ASN 数据库加载失败", { error: err.message });
      }
    } else {
      logger.warn("GeoIP ASN 数据库文件不存在", { path: asnDbPath });
      // 尝试自动下载
      logger.info("尝试自动下载 GeoLite2-ASN.mmdb");
      const downloadSuccess = await downloadGeoIPDatabase(asnDbPath, "GeoLite2-ASN.mmdb");
      if (downloadSuccess) {
        try {
          const buffer = await readFile(asnDbPath);
          asnReader = new maxmind.Reader(buffer, { watch: false });
          logger.info("GeoIP ASN 数据库加载成功（自动下载）");
        } catch (err) {
          logger.warn("下载后的 ASN 数据库加载失败", { error: err.message });
        }
      } else {
        logger.error("GeoLite2-ASN.mmdb 自动下载失败，请手动下载");
      }
    }
    
    // 加载 City 数据库（包含详细位置信息，使用 maxmind.Reader 方式）
    const cityDbPath = path.join(__dirname, "GeoLite2-City.mmdb");
    if (await fileExists(cityDbPath)) {
      try {
        const buffer = await readFile(cityDbPath);
        cityReader = new maxmind.Reader(buffer, { watch: false });
        logger.info("GeoIP City 数据库加载成功");
      } catch (err) {
        logger.warn("GeoIP City 数据库加载失败", { error: err.message });
      }
    } else {
      logger.warn("GeoIP City 数据库文件不存在", { path: cityDbPath });
      // 尝试自动下载
      logger.info("尝试自动下载 GeoLite2-City.mmdb");
      const downloadSuccess = await downloadGeoIPDatabase(cityDbPath, "GeoLite2-City.mmdb");
      if (downloadSuccess) {
        try {
          const buffer = await readFile(cityDbPath);
          cityReader = new maxmind.Reader(buffer, { watch: false });
          logger.info("GeoIP City 数据库加载成功（自动下载）");
        } catch (err) {
          logger.warn("下载后的 City 数据库加载失败", { error: err.message });
        }
      } else {
        logger.error("GeoLite2-City.mmdb 自动下载失败，请手动下载");
      }
    }
    
  } catch (err) {
    logger.error("GeoIP 数据库初始化失败", { error: err.message, message: "将跳过地理位置查询功能" });
  }
}

// 在后台异步加载 GeoIP 数据库，不阻塞服务器启动
initGeoIP().catch(err => {
  logger.warn('GeoIP 数据库加载失败，将在后台重试', { error: err.message });
});

// ------------------- 请求频率限制和缓存 -------------------
const requestCache = new Map(); // 用于缓存 API 响应
const rateLimitMap = new Map(); // 用于速率限制

// 获取客户端真实IP（支持代理）
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.ip ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
}

// 请求日志中间件（记录 API 请求）- 放在 getClientIP 定义之后
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    const startTime = Date.now();
    const originalSend = res.send;
    const clientIp = getClientIP(req);
    
    // 记录请求开始（静默模式下不输出）
    // 不输出查询参数和客户端IP（避免泄露敏感信息）
    if (!QUIET_MODE) {
      logger.debug(`API 请求开始`, {
        method: req.method,
        path: req.path
      });
    }
    
    res.send = function(data) {
      const duration = Date.now() - startTime;
      const logLevel = res.statusCode >= 500 ? 'error' : 
                       res.statusCode >= 400 ? 'warn' : 'info';
      
      // 静默模式下只输出错误和警告，不输出成功的API请求
      // 不输出客户端IP（避免泄露敏感信息）
      if (!QUIET_MODE || res.statusCode >= 400) {
        logger[logLevel](`API 请求完成`, {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration: `${duration}ms`
        });
      }
      
      return originalSend.call(this, data);
    };
  }
  
  next();
});

function checkRateLimit(ip) {
  const now = Date.now();
  const key = `rate_${ip}`;
  const record = rateLimitMap.get(key);
  
  if (!record || now - record.firstRequest > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { firstRequest: now, count: 1 });
    return true;
  }
  
  if (record.count >= MAX_REQUESTS_PER_IP) {
    // 不输出IP地址（避免泄露敏感信息）
    logger.warn('速率限制触发', { count: record.count, limit: MAX_REQUESTS_PER_IP });
    return false;
  }
  
  record.count++;
  // 不输出IP地址（避免泄露敏感信息）
  if (!QUIET_MODE) {
    logger.debug(`速率限制计数`, { count: record.count, limit: MAX_REQUESTS_PER_IP });
  }
  return true;
}

// 定期清理过期缓存和速率限制记录（已集成到内存管理模块，保留此作为备用）
// 注意：主要的内存清理已由上面的内存管理模块处理
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  // 清理过期缓存
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      requestCache.delete(key);
      cleaned++;
    }
  }
  
  // 清理过期的速率限制记录
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.firstRequest > RATE_LIMIT_WINDOW * 2) {
      rateLimitMap.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`定期清理完成，清理了 ${cleaned} 条过期记录`);
  }
}, 60000); // 每分钟清理一次

// ------------------- 工具函数 -------------------
// IP 格式验证函数
function isIPAddress(str) {
  if (!str || typeof str !== 'string') return false;
  
  // IPv4 验证（检查每个段是否在 0-255 范围内）
  const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (ipv4Regex.test(str)) {
    const parts = str.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }
  
  // IPv6 验证（简化版本）
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^::/;
  return ipv6Regex.test(str);
}

function isDomain(str) {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
  return domainRegex.test(str);
}

// ------------------- DNS 解析（支持 CNAME 递归解析，获取所有IP）-------------------
async function resolveDomain(domain, visited = new Set(), depth = 0) {
  if (depth > DNS_MAX_RECURSION_DEPTH) {
    throw new Error(`CNAME 递归深度超过限制（${DNS_MAX_RECURSION_DEPTH}层）`);
  }
  if (visited.has(domain)) {
    throw new Error("检测到 CNAME 循环引用");
  }
  visited.add(domain);

  // 如果是IP地址，直接返回，不进行DNS查询
  if (isIPAddress(domain)) {
    return [domain];
  }

  // 收集所有可能的IP地址
  const allIPs = new Set();

  try {
    // 方法1: 尝试直接解析 A 记录
    try {
      const addresses = await dnsResolve4(domain);
      if (Array.isArray(addresses) && addresses.length > 0) {
        addresses.forEach(ip => allIPs.add(ip));
      }
    } catch (err) {
      // 继续尝试其他方法
    }

    // 方法2: 检查 CNAME 记录
    try {
      const cnameRecords = await dnsResolveCname(domain);
      if (Array.isArray(cnameRecords) && cnameRecords.length > 0) {
        for (const cname of cnameRecords) {
          const resolvedIPs = await resolveDomain(cname, visited, depth + 1);
          resolvedIPs.forEach(ip => allIPs.add(ip));
        }
      }
    } catch (err) {
      // 继续尝试其他方法
    }

    // 方法3: 通用解析
    try {
      const records = await dnsResolve(domain, 'A');
      if (Array.isArray(records) && records.length > 0) {
        records.forEach(ip => allIPs.add(ip));
      }
    } catch (err) {
      // 继续尝试其他方法
    }

    // 方法4: lookup
    try {
      const result = await dnsLookup(domain, { all: true, family: 4 });
      if (Array.isArray(result)) {
        result.forEach(r => allIPs.add(r.address));
      } else {
        allIPs.add(result.address);
      }
    } catch (err) {
      try {
        const result = await dnsLookup(domain, { family: 4 });
        allIPs.add(result.address);
      } catch (err2) {
        // 忽略
      }
    }

    if (allIPs.size > 0) {
      const uniqueIPs = Array.from(allIPs);
      // 静默模式下不输出DNS解析成功信息
      // 即使不在静默模式，也不输出具体域名和IP地址，只输出数量（避免泄露敏感信息）
      if (depth === 0 && !QUIET_MODE) {
        logger.info(`DNS 解析成功`, { count: uniqueIPs.length });
      }
      return uniqueIPs;
    }

    throw new Error(`未找到 ${domain} 的 A 记录或 CNAME 记录`);
  } catch (err) {
    if (err.message.includes('ENOTFOUND') || err.message.includes('ENODATA')) {
      throw new Error(`域名 ${domain} 不存在或无法解析`);
    }
    throw err;
  }
}

// ------------------- API -------------------
app.get("/api", async (req, res) => {
  let { ip, port = DEFAULT_PORT, host, wsPath = DEFAULT_WS_PATH } = req.query;
  
  // 参数验证
  if (!ip) {
    return res.status(400).json({ 
      error: "缺少必需参数",
      message: "需要提供 ip 参数"
    });
  }


  // 检测并解析 IP:端口 格式（例如 1.164.110.203:10029）
  const ipPortMatch = ip.match(/^(.+?):(\d+)$/);
  if (ipPortMatch) {
    ip = ipPortMatch[1];
    port = ipPortMatch[2];
  }

  // 如果 Host 为空，使用默认值
  if (!host || host.trim() === "") {
    host = DEFAULT_HOST;
  }

  // 如果端口为空或未指定，使用默认端口
  if (!port || port === "" || port === String(DEFAULT_PORT)) {
    port = DEFAULT_PORT;
  }

  // IP 格式验证
  const isIP = isIPAddress(ip);
  const isDomainName = isDomain(ip);
  
  if (!isIP && !isDomainName) {
    return res.status(400).json({ 
      error: "无效的 IP 地址或域名",
      message: "请提供有效的 IP 地址或域名（支持 IPv4、IPv6 或域名，也可使用 IP:端口 格式）"
    });
  }

  // 如果是域名，解析为多个 IP
  let targetIPs = [];
  if (isDomainName) {
    try {
      // 静默模式下不输出DNS解析信息
      // 即使不在静默模式，也不输出具体域名（避免泄露敏感信息）
      if (!QUIET_MODE) {
        logger.info(`开始 DNS 解析`, { count: '...' });
      }
      targetIPs = await resolveDomain(ip);
      if (!targetIPs || targetIPs.length === 0) {
        return res.status(400).json({ 
          error: "DNS 解析失败",
          message: "域名解析未返回任何 IP 地址"
        });
      }
    } catch (err) {
      return res.status(400).json({ 
        error: "DNS 解析失败",
        message: err.message
      });
    }
  } else {
    // 单个 IP
    targetIPs = [ip];
  }
  
  // 限制最大检测 IP 数量，防止资源耗尽
  const MAX_IP_COUNT = 50;
  if (targetIPs.length > MAX_IP_COUNT) {
    return res.status(400).json({ 
      error: "IP 数量过多",
      message: `检测 IP 数量不能超过 ${MAX_IP_COUNT} 个，当前为 ${targetIPs.length} 个`
    });
  }

  // 速率限制（使用真实IP）
  const clientIp = getClientIP(req);
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ 
      error: "请求过于频繁",
      message: "请稍后再试"
    });
  }

  const targetPort = parseInt(port);
  if (isNaN(targetPort) || targetPort < 1 || targetPort > 65535) {
    return res.status(400).json({ 
      error: "无效的端口号",
      message: "端口号必须在 1-65535 之间"
    });
  }

  // 检查缓存
  // 对于域名，使用原始输入作为缓存键；对于IP，直接使用IP
  let cacheKey;
  if (isDomainName) {
    // 域名检测：使用原始输入作为缓存键
    cacheKey = `domain_${ip}_${targetPort}_${host}`;
  } else {
    // 单个IP：直接使用IP作为缓存键
    cacheKey = `ip_${ip}_${targetPort}_${host}`;
  }
  
  const cached = requestCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    // 静默模式下不输出缓存使用信息
    if (!QUIET_MODE) {
      logger.debug(`使用缓存`, { key: cacheKey, age: `${Math.round((Date.now() - cached.timestamp) / 1000)}s` });
    }
    return res.json(cached.data);
  }

  // 检测单个 IP 的函数（完全独立，不共享状态）
  async function detectSingleIP(targetIP, index, total) {
    // 每个检测都有独立的结果对象，避免数据混淆
    const result = {
      ip: targetIP,  // 明确标记IP，确保结果对应正确
      checks: { 
        tls_detect: false, 
        ws_real_connect: false, 
        cdn_trace: false 
      },
    latency: {},
    geoip: null,
    cdn: { warp: "off" }
  };

    try {
      // 只在启用检测DEBUG日志时输出详细信息（不输出IP地址和host，避免泄露）
      if (ENABLE_DETECTION_DEBUG) {
        logger.debug(`开始检测 IP`, { index: index + 1, total });
      }

      // ----- GeoIP 查询 -----
      try {
        const geoipData = await lookupGeoIP(targetIP);
        if (geoipData && Object.keys(geoipData).length > 0) {
          result.geoip = geoipData;
          // 只在启用检测DEBUG日志时输出（不输出IP地址，避免泄露）
          if (ENABLE_DETECTION_DEBUG) {
            logger.debug(`GeoIP 查询成功`, { 
              location: `${geoipData.city || ''}${geoipData.city ? ', ' : ''}${geoipData.countryName || geoipData.country || ''}`,
              organization: geoipData.organization 
            });
          }
        }
      } catch (err) {
        // 错误日志也不输出IP地址（避免泄露）
        logger.warn(`GeoIP 查询失败`, { error: err.message });
      }

      // ----- TLS 检测 -----
      const tlsStart = Date.now();
      try {
        await testTLS(targetIP, targetPort, host);
        result.checks.tls_detect = true;
        result.latency.tls_handshake_ms = Date.now() - tlsStart;
        // 只在启用检测DEBUG日志时输出成功信息（不输出IP地址，避免泄露）
        if (ENABLE_DETECTION_DEBUG) {
          logger.debug(`TLS 检测成功`, { latency: `${result.latency.tls_handshake_ms}ms` });
        }
      } catch (err) {
        result.checks.tls_detect = false;
        result.latency.tls_handshake_ms = Date.now() - tlsStart;
        // 错误日志也不输出IP地址（避免泄露）
        logger.warn(`TLS 检测失败`, { error: err.message });
      }

      // ----- WebSocket 检测 -----
      const wsStart = Date.now();
      if (DISABLE_WEBSOCKET) {
        // 云平台环境：跳过 WebSocket 检测
        result.checks.ws_real_connect = false;
        result.latency.ws_connect_ms = 0;
        // 只在启用检测DEBUG日志时输出（不输出IP地址，避免泄露）
        if (ENABLE_DETECTION_DEBUG) {
          logger.debug(`WebSocket 已禁用`, { reason: '云平台优化' });
        }
      } else {
        try {
          const wsInfo = await testWebSocket(targetIP, targetPort, host, wsPath);
          result.checks.ws_real_connect = true;
          result.latency.ws_connect_ms = Date.now() - wsStart;
          if (wsInfo) result.websocket = wsInfo;
          // 只在启用检测DEBUG日志时输出成功信息（不输出IP地址，避免泄露）
          if (ENABLE_DETECTION_DEBUG) {
            logger.debug(`WebSocket 检测成功`, { latency: `${result.latency.ws_connect_ms}ms` });
          }
        } catch (err) {
          result.checks.ws_real_connect = false;
          result.latency.ws_connect_ms = Date.now() - wsStart;
          // 错误日志也不输出IP地址（避免泄露）
          logger.warn(`WebSocket 检测失败`, { error: err.message });
        }
      }

      // ----- CDN Trace 检测 -----
      if (DISABLE_CDN_TRACE) {
        // 云平台环境：跳过 CDN Trace 检测
        result.checks.cdn_trace = false;
        // 只在启用检测DEBUG日志时输出（不输出IP地址，避免泄露）
        if (ENABLE_DETECTION_DEBUG) {
          logger.debug(`CDN Trace 已禁用`, { reason: '云平台优化' });
        }
      } else {
        try {
          const cdnResult = await testCDNTrace(targetIP, targetPort, host);
          result.checks.cdn_trace = cdnResult.success;
          if (cdnResult.warp) result.cdn.warp = cdnResult.warp;
          // 只在启用检测DEBUG日志时输出（成功和失败都不输出，减少日志）
          // 仅在失败时输出警告（不输出IP地址，避免泄露）
        } catch (err) {
          result.checks.cdn_trace = false;
          logger.warn(`CDN Trace 检测失败`, { error: err.message });
        }
      }

      // 只在启用检测DEBUG日志时输出完成信息（不输出IP地址，避免泄露）
      if (ENABLE_DETECTION_DEBUG) {
        logger.debug(`IP 检测完成`);
      }
      return result;
    } catch (err) {
      // 即使检测过程中出现意外错误，也返回部分结果，不影响其他IP
      // 错误日志也不输出IP地址（避免泄露）
      logger.error(`IP 检测异常`, { error: err.message });
      result.error = err.message;
      return result;
    }
  }

  // 并行检测所有 IP（每个IP完全独立，使用 Promise.all 避免一个失败影响全部）
  // 添加并发控制：如果IP数量过多，分批检测
  const MAX_CONCURRENT = 10; // 最大并发数
  
  // 静默模式下不输出检测开始信息
  // 即使不在静默模式，也不输出具体IP数量（避免泄露敏感信息）
  if (!QUIET_MODE) {
    logger.info(`开始检测`, { maxConcurrent: MAX_CONCURRENT });
  }
  
  const results = [];
  for (let i = 0; i < targetIPs.length; i += MAX_CONCURRENT) {
    const batch = targetIPs.slice(i, i + MAX_CONCURRENT);
    const batchResults = await Promise.all(
      batch.map((targetIP, batchIndex) => 
        detectSingleIP(targetIP, i + batchIndex, targetIPs.length)
      )
    );
    results.push(...batchResults);
  }

  // 验证结果完整性（仅在开发环境或结果异常时输出警告）
  if (results.length !== targetIPs.length) {
    logger.warn(`检测结果数量不匹配`, { 
      resultsCount: results.length, 
      ipsCount: targetIPs.length 
    });
  }

  // 清理和精简结果数据
  const cleanedResults = results.map(r => {
    const cleaned = {
      ip: r.ip,
      checks: r.checks,
      latency: r.latency
    };
    
    // 保留geoip信息（位置和组织/ASN）- 即使部分字段为空也要保留对象
    if (r.geoip) {
      cleaned.geoip = {
        city: r.geoip.city || null,
        country: r.geoip.country || null,
        countryName: r.geoip.countryName || null,
        latitude: r.geoip.latitude || null,
        longitude: r.geoip.longitude || null,
        asn: r.geoip.asn || null,
        organization: r.geoip.organization || null
      };
    }
    
    // 保留cdn信息（包括warp状态）
    if (r.cdn) {
      cleaned.cdn = { warp: r.cdn.warp || "off" };
    }
    
    // 仅在有WebSocket连接时才添加websocket信息，并精简字段
    if (r.websocket && r.websocket.connected) {
      cleaned.websocket = {
        connected: true,
        protocol: r.websocket.protocol || null
      };
    }
    
    return cleaned;
  });

  // 判断是否使用默认host（避免泄露默认配置）
  const isDefaultHost = host === DEFAULT_HOST;
  
  // 构建响应
  let response;
  
  if (targetIPs.length === 1) {
    // 单个IP：直接在顶层返回，不包含results数组（避免重复）
    response = {
      input: ip,
      isDomain: isDomainName,
      port: targetPort,  // 添加port字段，前端需要显示
      ...cleanedResults[0],  // 直接展开单个结果的所有字段
      timestamp: new Date().toISOString()
    };
    // 仅在使用非默认host时才返回host字段
    if (!isDefaultHost) {
      response.host = host;
    }
  } else {
    // 多个IP：使用results数组
    response = {
      input: ip,
      isDomain: isDomainName,
      resolvedIPs: targetIPs,
      port: targetPort,
      results: cleanedResults,
      timestamp: new Date().toISOString()
    };
    // 仅在使用非默认host时才返回host字段
    if (!isDefaultHost) {
      response.host = host;
    }
  }

  // 缓存结果
  requestCache.set(cacheKey, { data: response, timestamp: Date.now() });

  // 输出汇总（静默模式下不输出）
  // 不输出具体数量，只输出统计信息（避免泄露敏感信息）
  if (!QUIET_MODE) {
    const tlsSuccess = results.filter(r => r.checks.tls_detect).length;
    const wsSuccess = results.filter(r => r.checks.ws_real_connect).length;
    const cdnSuccess = results.filter(r => r.checks.cdn_trace).length;
    
    logger.info(`检测完成`, {
      tls: `${tlsSuccess}/${results.length}`,
      websocket: `${wsSuccess}/${results.length}`,
      cdnTrace: `${cdnSuccess}/${results.length}`
    });
  }

  res.json(response);
});

// ------------------- GeoIP 查询 -------------------
async function lookupGeoIP(ip) {
  if (!cityReader && !asnReader) {
    return null;
  }

  try {
    const cityData = cityReader ? cityReader.get(ip) : null;
    const asnData = asnReader ? asnReader.get(ip) : null;

    if (!cityData && !asnData) {
      return null;
    }

    const result = {};
    
    if (cityData) {
      result.city = cityData.city?.names?.en || cityData.city?.names?.zh || "";
      result.country = cityData.country?.iso_code || "";
      result.countryName = cityData.country?.names?.en || cityData.country?.names?.zh || "";
      if (cityData.location) {
        result.latitude = cityData.location.latitude || null;
        result.longitude = cityData.location.longitude || null;
      }
    }

    if (asnData) {
      result.asn = asnData.autonomous_system_number || null;
      result.organization = asnData.autonomous_system_organization || "";
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (err) {
    // 错误日志也不输出IP地址（避免泄露敏感信息）
    logger.warn(`GeoIP 查询异常`, { error: err.message });
    return null;
  }
}

// ------------------- TLS 检测（通过 HTTPS）-------------------
async function testTLS(ip, port = DEFAULT_PORT, host) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: ip,
      port: port,
      path: '/',
      method: 'HEAD',
      rejectUnauthorized: false,
      timeout: TLS_TIMEOUT,
      servername: host, // 设置 SNI（Server Name Indication）
      headers: {
        'Host': host
      }
    };

    const req = https.request(options, (res) => {
      resolve(true);
    });

    req.on('error', (err) => {
      reject(new Error(err.message || "TLS 连接失败"));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`TLS 连接超时（${TLS_TIMEOUT/1000}秒）`));
    });

    req.end();
  });
}

// ------------------- WebSocket 检测 -------------------
async function testWebSocket(ip, port = DEFAULT_PORT, host, wsPath = DEFAULT_WS_PATH) {
  return new Promise((resolve, reject) => {
    // 使用 IP 地址连接，但在 Host 头中使用 host
    const url = `wss://${ip}:${port}${wsPath}`;
    let timeout = null;
    let isResolved = false;

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
    };

    const safeReject = (error) => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        reject(error);
      }
    };

    const safeResolve = (value) => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        resolve(value);
      }
    };

    try {
      // WebSocket 连接配置
      const wsOptions = {
        rejectUnauthorized: false, // 允许自签名证书（用于测试）
        handshakeTimeout: WEBSOCKET_TIMEOUT,
        perMessageDeflate: false,
        headers: {
          'Host': host || ip // 在 Host 头中指定原始 host
        }
      };

      // 使用 createConnection 自定义底层 TLS 连接以设置 SNI（仅在有 host 时）
      if (host) {
        wsOptions.createConnection = (options, callback) => {
          // 直接使用 tls.connect，设置正确的 host 和 servername
          const socket = tls.connect({
            host: ip,              // 连接到实际 IP
            port: port,            // 连接到实际端口
            servername: host,      // SNI 使用 host 域名
            rejectUnauthorized: false,
            ...options
          }, callback);
          return socket;
        };
      }

      const ws = new WebSocket(url, wsOptions);

      timeout = setTimeout(() => {
        if (!isResolved) {
          // 添加错误监听器来捕获 terminate 可能引发的错误
          ws.on("error", () => {}); // 忽略错误
          try {
            // WebSocket 状态: CONNECTING = 0, OPEN = 1, CLOSING = 2, CLOSED = 3
            if (ws.readyState === 0 || ws.readyState === 1) {
              ws.terminate();
            }
          } catch (err) {
            // 忽略 terminate 错误
          }
          safeReject(new Error(`连接超时（${WEBSOCKET_TIMEOUT/1000}秒）`));
        }
      }, WEBSOCKET_TIMEOUT);

      ws.on("open", () => {
        // 仅返回关键信息，精简响应
        const wsInfo = {
          connected: true,
          protocol: ws.protocol || null
        };

        ws.close();
        safeResolve(wsInfo);
      });

      ws.on("error", (err) => {
        // 处理各种 WebSocket 连接错误
        const errorMsg = err.message || "";
        const errorCode = err.code || "";
        
        if (errorMsg.includes("EACCES") ||
            errorMsg.includes("permission denied") ||
            errorMsg.includes("EPERM")) {
          safeReject(new Error("当前环境不支持 WebSocket 检测（权限限制）"));
        } else if (errorMsg.includes("ECONNREFUSED") || 
                   errorCode === "ECONNREFUSED") {
          safeReject(new Error("WebSocket 连接被拒绝（目标服务器未开放该端口或服务）"));
        } else if (errorMsg.includes("ETIMEDOUT") || 
                   errorMsg.includes("timeout")) {
          safeReject(new Error("WebSocket 连接超时"));
        } else if (errorMsg.includes("ENOTFOUND") || 
                   errorMsg.includes("getaddrinfo")) {
          safeReject(new Error("无法解析目标地址"));
        } else {
          safeReject(new Error(errorMsg || "WebSocket 连接失败"));
        }
      });

      ws.on("close", () => {
        // close 事件不触发 reject，因为可能是正常关闭
      });
    } catch (err) {
      safeReject(new Error(`创建 WebSocket 连接失败: ${err.message}`));
    }
  });
}

// ------------------- CDN Trace 检测 -------------------
async function testCDNTrace(ip, port = DEFAULT_PORT, host) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: ip,
      port: port,
      path: '/cdn-cgi/trace',
      method: 'GET',
      rejectUnauthorized: false,
      timeout: CDN_TRACE_TIMEOUT,
      servername: host, // 设置 SNI（Server Name Indication）
      headers: {
        'Host': host
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode !== 200 || !data?.trim()) {
          resolve({ 
            success: false, 
            warp: "off",
            reason: res.statusCode === 404 || res.statusCode === 403 ? `端点不可用 (HTTP ${res.statusCode})` : 
                   res.statusCode !== 200 ? `HTTP ${res.statusCode}` : "响应为空"
          });
          return;
        }

        const warpMatch = data.match(/warp=(\w+)/);
        const warp = warpMatch ? warpMatch[1] : "off";

        resolve({ 
          success: true, 
          warp: warp === "on" ? "on" : "off"
        });
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, warp: "off", reason: err.message || "连接失败" });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, warp: "off", reason: `请求超时（${CDN_TRACE_TIMEOUT/1000}秒）` });
    });

    req.end();
  });
}

// ------------------- 404 处理 -------------------
app.use((req, res) => {
  // 对于静态资源请求返回 204，避免产生错误日志
  if (req.path.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/i)) {
    res.status(204).end();
    return;
  }
  res.status(404).json({ 
    error: "未找到资源",
    message: `路径 ${req.path} 不存在`
  });
});

// ------------------- 错误处理中间件（必须在所有路由之后）-------------------
app.use((err, req, res, next) => {
  logger.error("服务器错误", { error: err.message, stack: err.stack });
  res.status(500).json({ 
    error: "服务器内部错误",
    message: err.message 
  });
});

// ------------------- 启动服务 -------------------
function startServer() {
  try {
    // 先启动服务器，不等待 GeoIP 加载
    const server = app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      logger.info('CF IP 检测服务已启动');
      console.log(`  端口: ${PORT}`);
      console.log(`  API: http://localhost:${PORT}/api`);
      console.log(`  Web: http://localhost:${PORT}/`);
      console.log('\n功能配置:');
      console.log(`  WebSocket: ${DISABLE_WEBSOCKET ? '⏭️ 已禁用' : '✅ 已启用'}`);
      console.log(`  CDN Trace: ${DISABLE_CDN_TRACE ? '⏭️ 已禁用' : '✅ 已启用'}`);
      console.log(`  GeoIP: ✅ 自动加载（后台）`);
      console.log(`  日志级别: ${LOG_LEVEL}`);
      console.log(`  检测DEBUG日志: ${ENABLE_DETECTION_DEBUG ? '✅ 已启用' : '⏭️ 已禁用（减少日志输出）'}`);
      console.log(`  静默模式: ${QUIET_MODE ? '✅ 已启用（不输出检测内容）' : '⏭️ 已禁用'}`);
      console.log(`  内存清理阈值: ${MEMORY_CLEANUP_THRESHOLD} MB`);
      console.log('='.repeat(60) + '\n');
      
      // 输出内存使用情况
      logMemoryUsage('启动时');
    });

    // 处理优雅关闭
    process.on('SIGTERM', () => {
      logger.info('收到 SIGTERM 信号，正在关闭服务器...');
      logMemoryUsage('关闭前');
      server.close(() => {
        logger.info('服务器已关闭');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('收到 SIGINT 信号，正在关闭服务器...');
      logMemoryUsage('关闭前');
      server.close(() => {
        logger.info('服务器已关闭');
        process.exit(0);
      });
    });

  } catch (err) {
    logger.error('启动服务器失败', { error: err.message });
    process.exit(1);
  }
}

startServer();
