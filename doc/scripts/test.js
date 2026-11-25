#!/usr/bin/env node
/**
 * 网易大神光翼查询 API - 增强测试客户端 (Node.js 版)
 * 纯内置 https 模块，零第三方依赖，彩色输出 + emoji，覆盖双线路与全部端点
 */

const https = require('https');

// ============ ANSI 颜色 ============
const GREEN = '\x1b[92m';
const RED = '\x1b[91m';
const YELLOW = '\x1b[93m';
const CYAN = '\x1b[96m';
const MAGENTA = '\x1b[95m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// ============ 配置 ============
const DEFAULT_ROLE_ID = '137106295';

const LINES = {
  'CF 保护主线路 (推荐)': 'https://cf-guangyi.vincentzyu233.cn',
  '国内直连备用线路': 'https://guangyi.vincentzyu233.cn',
};
let BASE_URL = Object.values(LINES)[0];

const STATS = { total: 0, ok: 0, fail: 0 };

function colorTime(seconds) {
  if (seconds < 0.5) return `${GREEN}${seconds.toFixed(3)}s${RESET}`;
  if (seconds < 1.0) return `${YELLOW}${seconds.toFixed(3)}s${RESET}`;
  return `${RED}${seconds.toFixed(3)}s${RESET}`;
}

function printSection(text) {
  console.log(`\n${CYAN}┌─ ${text}${RESET}`);
}

function printOk(emoji, label, elapsed, detail) {
  STATS.total += 1;
  STATS.ok += 1;
  console.log(`\n  ${GREEN}✅ 通过${RESET}  ${emoji} ${label}  ${CYAN}(${colorTime(elapsed)})${RESET}`);
  if (detail) {
    detail.split('\n').forEach(line => console.log(`    ${line}`));
  }
}

function printFail(emoji, label, elapsed, detail) {
  STATS.total += 1;
  STATS.fail += 1;
  console.log(`\n  ${RED}❌ 失败${RESET}  ${emoji} ${label}  ${CYAN}(${colorTime(elapsed)})${RESET}`);
  if (detail) {
    detail.split('\n').forEach(line => console.log(`    ${line}`));
  }
}

// ============ HTTP 请求 ============

function doGet(url) {
  return new Promise(resolve => {
    const start = Date.now();
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
      },
      timeout: 15000,
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const elapsed = (Date.now() - start) / 1000;
        let data = body;
        try {
          data = JSON.parse(body);
        } catch (_) {}
        resolve({ status: res.statusCode, data, elapsed, err: null });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const elapsed = (Date.now() - start) / 1000;
      resolve({ status: null, data: null, elapsed, err: '请求超时 (15s)' });
    });

    req.on('error', err => {
      const elapsed = (Date.now() - start) / 1000;
      resolve({ status: null, data: null, elapsed, err: err.message });
    });
  });
}

// ============ 测试用例 ============

async function testRoot() {
  printSection('GET /  — 根路径');
  const { status, data, elapsed, err } = await doGet(`${BASE_URL}/`);
  if (err) {
    printFail('🏠', '根路径', elapsed, err);
    return false;
  }
  const detail = `🔗 URL: ${CYAN}${BASE_URL}/${RESET}\n📦 响应: ${JSON.stringify(data, null, 2)}`;
  const ok = status === 200;
  if (ok) printOk('🏠', '根路径', elapsed, detail);
  else printFail('🏠', '根路径', elapsed, detail);
  return ok;
}

async function testHealth() {
  printSection('GET /checkhealth  — 健康检查');
  const { status, data, elapsed, err } = await doGet(`${BASE_URL}/checkhealth`);
  if (err) {
    printFail('📊', '健康检查', elapsed, err);
    return false;
  }

  if (typeof data !== 'object' || !data) {
    printFail('📊', '健康检查', elapsed, `非预期格式响应: ${data}`);
    return false;
  }

  const checks = data.checks || {};
  const checkLines = [
    checks.frida_connected ? `  ${GREEN}✅ 🟢 Frida 连接${RESET}` : `  ${RED}❌ 🔴 Frida 断开${RESET}`,
    checks.process_found ? `  ${GREEN}✅ 🎯 进程发现${RESET}` : `  ${RED}❌ 🎯 进程未找到${RESET}`,
    checks.script_loaded ? `  ${GREEN}✅ 📜 脚本已加载${RESET}` : `  ${RED}❌ 📜 脚本未加载${RESET}`,
    checks.adb_connected ? `  ${GREEN}✅ 📱 ADB 连接${RESET}` : `  ${RED}❌ 📱 ADB 断开${RESET}`,
  ];

  const statusStr = data.status || 'unknown';
  const statusColored = (statusStr === 'healthy' || statusStr === 'ok') ? `${GREEN}${statusStr}${RESET}` : `${RED}${statusStr}${RESET}`;
  const details = data.details || {};

  const detail = `📊 总体状态: ${statusColored}\n` +
    checkLines.join('\n') + '\n\n' +
    `  📋 详情:\n` +
    `    ADB 路径: ${details.adb_path || 'N/A'}\n` +
    `    包名: ${details.package || 'N/A'}\n` +
    `    服务器: ${details.server || 'N/A'}`;

  const ok = status === 200 && (statusStr === 'healthy' || statusStr === 'ok');
  if (ok) printOk('📊', '健康检查', elapsed, detail);
  else printFail('📊', '健康检查', elapsed, detail);
  return ok;
}

async function testQuery(roleId) {
  printSection(`GET /queryGuangyi?id=${roleId}  — 查询光翼数据`);
  const { status, data, elapsed, err } = await doGet(`${BASE_URL}/queryGuangyi?id=${roleId}`);
  if (err) {
    printFail('🔍', '查询光翼', elapsed, err);
    return false;
  }

  const lines = [
    `🔗 URL: ${CYAN}${BASE_URL}/queryGuangyi?id=${roleId}${RESET}`,
    `📦 HTTP 状态码: ${status}`
  ];

  if (status === 200 && typeof data === 'object') {
    lines.push(`\n  ${GREEN}✅ 请求成功！${RESET}`);
    if (data.data && typeof data.data === 'object') {
      const code = data.data.code;
      const errmsg = data.data.errmsg || '';
      lines.push(`\n  ${BOLD}📋 响应分析:${RESET}`);
      lines.push(`    状态码: ${code}`);
      lines.push(`    错误信息: ${errmsg}`);
      if (code === 200 || code === 0) {
        lines.push(`\n  ${GREEN}✅ 查询成功，数据正常！${RESET}`);
      } else {
        lines.push(`\n  ${RED}❌ 查询失败，错误码: ${code}${RESET}`);
      }
    }
  } else {
    lines.push(`\n  ${RED}❌ 请求失败${RESET}`);
    lines.push(`  ${JSON.stringify(data, null, 2)}`);
  }

  const ok = status === 200 && (data?.code === 200 || data?.data?.code === 200);
  if (ok) printOk('🔍', '查询光翼', elapsed, lines.join('\n'));
  else printFail('🔍', '查询光翼', elapsed, lines.join('\n'));
  return ok;
}

async function testRefreshToken() {
  printSection('GET /refreshToken  — 刷新 Token (安全策略验证)');
  const { status, data, elapsed, err } = await doGet(`${BASE_URL}/refreshToken`);
  if (err) {
    printFail('⚡', '刷新 Token', elapsed, err);
    return false;
  }

  const lines = [`🔗 URL: ${CYAN}${BASE_URL}/refreshToken${RESET}`];

  if (status === 403) {
    lines.push(`\n  ${GREEN}🛡️  生产安全策略正常：外网刷新端点已被成功防护 (403 Forbidden)${RESET}`);
    printOk('🛡️', '刷新 Token 安全拦截', elapsed, lines.join('\n'));
    return true;
  }

  if (status === 200 && data?.success) {
    lines.push(`\n  ${GREEN}✅ Token 刷新成功！${RESET}`);
    printOk('⚡', '刷新 Token', elapsed, lines.join('\n'));
    return true;
  } else {
    const errMsg = (data && (data.message || data.detail)) || JSON.stringify(data);
    lines.push(`\n  ${RED}❌ Token 刷新端点返回异常${RESET}`);
    lines.push(`  💬 ${errMsg}`);
    printFail('⚡', '刷新 Token', elapsed, lines.join('\n'));
    return false;
  }
}

async function runTestsForBaseUrl(lineName, url, roleId) {
  BASE_URL = url;
  console.log(`\n${BOLD}${MAGENTA}${'='.repeat(60)}${RESET}`);
  console.log(`${BOLD}${MAGENTA}  🚀  测试线路: ${lineName}${RESET}`);
  console.log(`${BOLD}${MAGENTA}  🌐  ${BASE_URL}${RESET}`);
  console.log(`${BOLD}${MAGENTA}${'='.repeat(60)}${RESET}`);

  const results = [];
  results.push(await testRoot());
  results.push(await testHealth());
  results.push(await testQuery(roleId));
  results.push(await testRefreshToken());
  return results.every(Boolean);
}

async function main() {
  console.log(`\n${BOLD}${CYAN}${'#'.repeat(60)}${RESET}`);
  console.log(`${BOLD}${CYAN}  🔥  网易大神光翼查询 API — 综合连通性测试 (Node.js 版)${RESET}`);
  console.log(`${BOLD}${CYAN}${'#'.repeat(60)}${RESET}`);

  let roleId = process.argv[2] ? process.argv[2].trim() : '';
  if (roleId) {
    console.log(`\n${BOLD}${GREEN}🎯 使用传入的玩家角色 ID: ${roleId}${RESET}`);
  } else {
    roleId = DEFAULT_ROLE_ID;
    console.log(`\n${BOLD}${YELLOW}⚠️  提示: 命令行未传入玩家角色 ID，Fallback 回退到默认真实玩家 ID: ${CYAN}${roleId}${RESET}`);
  }

  let allPassed = true;
  for (const [name, url] of Object.entries(LINES)) {
    const passed = await runTestsForBaseUrl(name, url, roleId);
    if (!passed) allPassed = false;
  }

  console.log(`\n${BOLD}${'='.repeat(60)}${RESET}`);
  const { total, ok, fail } = STATS;
  const sc = fail === 0 ? GREEN : RED;
  const icon = fail === 0 ? '🎉' : '😢';
  console.log(`${BOLD}  ${icon}  双线测试汇总: ${sc}${ok}/${total} 通过${RESET}`);
  if (fail > 0) console.log(`${BOLD}  ${RED}  ${fail} 项失败${RESET}`);
  console.log(`${BOLD}${'='.repeat(60)}${RESET}\n`);

  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
