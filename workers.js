export default {
  async fetch(request, env) {
    // 获取名为 'backend' 的环境变量，如果没有设置，则回退到默认地址
    const backendUrl = env.backend || "";

    // 将 HTML 字符串中的占位符替换为实际的环境变量值
    const finalHTML = HTML.replace('__BACKEND_ENV_PLACEHOLDER__', backendUrl);

    return new Response(finalHTML, {
      headers: {
        "content-type": "text/html; charset=UTF-8",
        "cache-control": "no-store"
      }
    });
  }
};

const HTML = `<!DOCTYPE html>
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
  height:85vh; /* 使用 height 替代 max-height */
  background:var(--glass);
  backdrop-filter:blur(22px);
  border:1px solid var(--glass-border);
  border-radius:26px;
  box-shadow:0 30px 70px rgba(0,0,0,.28);
  z-index:9999;
  display:none; /* JS控制显示 */
  flex-direction: column; /* 启用flex布局以控制滚动 */
  overflow: hidden; /* 防止子元素溢出圆角 */
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
  flex-shrink: 0; /* 防止头部被压缩 */
}

.ip-detail-header .title {
  background: var(--primary-grad);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.ip-detail-body{
  padding: 8px 24px 24px;
  overflow-y: auto; /* 核心：激活滚动条 */
  flex-grow: 1; /* 核心：让body填满剩余空间 */
}

/* 美化滚动条 (可选) */
.ip-detail-body::-webkit-scrollbar { width: 5px; }
.ip-detail-body::-webkit-scrollbar-track { background: transparent; }
.ip-detail-body::-webkit-scrollbar-thumb { background: rgba(120, 120, 120, .4); border-radius: 3px; }

.section { 
  margin-top: 20px; 
}
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
.close:hover {
  color: var(--text);
}
</style>
</head>

<body>

<div class="app">
  <div class="glass">
    <h1>CF IP 远程检测</h1>
    <label>后端 API</label>
    <input id="backend" placeholder="默认为后台配置的环境变量">
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
/* ================= 原 iptest.js JS（逻辑保留） ================= */
const backendEl = document.getElementById("backend");
const inputsEl  = document.getElementById("inputs");
const hostEl    = document.getElementById("host");
const tableBody = document.getElementById("tableBody");
const mobileList= document.getElementById("mobileList");
const statusEl  = document.getElementById("status");
const startBtn  = document.getElementById("startBtn");
const clearBtn  = document.getElementById("clearBtn");

// 修改点 2: 将这里原本的 URL 改为特殊的占位符
// Worker 在返回 HTML 之前会把这个占位符替换成 env.backend 的值
const DEFAULT_BACKEND = "__BACKEND_ENV_PLACEHOLDER__";

// 页面加载时默认置空，除非 localStorage 有值
backendEl.value = localStorage.backend || "";

let map = L.map("map").setView([20,0],2);
L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}").addTo(map);
let marker=null, activeIP=null;

let isDetecting=false;
const cache=new Map();
const MAX_CONCURRENT=3;
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
  let queue=[...targets], order=0;

  async function next(){
    if(!queue.length && running === 0) {
        statusEl.textContent=\`✅ 检测完成（\${targets.length} 项）\`;
        setDetecting(false);
        return;
    }
    while(running < MAX_CONCURRENT && queue.length > 0){
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

  for(let i=0;i<MAX_CONCURRENT;i++) next();
}

async function detectOne(target){
  // 获取 API 时，如果输入框为空，则使用默认常量 (这个常量现在已经被替换成了环境变量的值)
  const endpoint = backendEl.value.trim() || DEFAULT_BACKEND;

  const key=\`\${endpoint}|\${target}|\${hostEl.value}\`;
  if(cache.has(key)) return cache.get(key);
  const params=new URLSearchParams({ip:target});
  if(hostEl.value.trim()) params.append("host",hostEl.value.trim());
  
  // 使用计算出的 endpoint
  const res=await fetch(endpoint+"/api?"+params);
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

/* ================= 优化后的 IP 详细信息展示逻辑 ================= */

function parseAbuseScore(v){
  if(!v) return 0;
  if(typeof v==="number") return v;
  const m=String(v).match(/[\\d.]+/);
  return m?parseFloat(m[0]):0;
}

function riskColor(score){
  if(score<0.5) return "#146c43"; // 极度纯净 (深绿)
  if(score<1)   return "#1f9d55"; // 纯净 (标准绿)
  if(score<3)   return "#84cc16"; //可信 (亮绿)
  if(score<8)   return "#adbe13"; // 轻微风险 (青黄)
  if(score<15)  return "#facc15"; // 风险 (黄)
  if(score<25)  return "#f97316"; // 中度风险 (橙)
  if(score<40)  return "#e45a25"; // 高风险 (橙红)
  if(score<60)  return "#dc3545"; // 严重风险 (标准红)
  return "#c81e1e";             // 极度风险 (深红)
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
  card.style.display="flex"; // 改为 flex
  body.innerHTML="加载中…";

  let d;
  try {
    if(ipapiCache.has(ip)){
      d=ipapiCache.get(ip);
    }else{
      d=await fetch("https://api.ipapi.is/?q="+ip).then(r=>r.json());
      ipapiCache.set(ip,d);
    }

    const companyScore=parseAbuseScore(d.company?.abuser_score);
    const asnScore=parseAbuseScore(d.asn?.abuser_score);
    const base=((companyScore+asnScore)/2)*5;
    const flags=["is_crawler","is_proxy","is_vpn","is_tor","is_abuser","is_bogon"];
    const riskCount=flags.filter(f=>!!d[f]).length;
    const score=Math.min(100,base*(1+riskCount*0.15)*100);

    const crawlerVal=d.is_crawler===false?"否":(typeof d.is_crawler==="string"?d.is_crawler:"是");

    // 类型中文映射及高亮处理
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
