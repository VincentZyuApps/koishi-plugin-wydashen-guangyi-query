// 网易大神光翼 / 藏宝阁衣柜 API 连通性测试 (Node.js 版)
// 只覆盖 3 个公网接口：/checkHealth、/queryGuangyi、/queryCbgInv

const https = require('https')

const GREEN = '\u001b[92m'
const RED = '\u001b[91m'
const CYAN = '\u001b[96m'
const MAGENTA = '\u001b[95m'
const BOLD = '\u001b[1m'
const RESET = '\u001b[0m'

const DEFAULT_ROLE_ID = '380594330'
const CBG_UUID = '37ec67d8-b55b-4cb3-b124-b20b67a98a10'

const LINES = {
  'CF 保护主线路 (推荐)': 'https://cf-guangyi.vincentzyu233.cn',
  '国内直连备用线路': 'https://guangyi.vincentzyu233.cn',
}

const stats = { total: 0, ok: 0, fail: 0 }

function colorTime(seconds) {
  if (seconds < 0.5) return `${GREEN}${seconds.toFixed(3)}s${RESET}`
  if (seconds < 1.0) return `${CYAN}${seconds.toFixed(3)}s${RESET}`
  return `${MAGENTA}${seconds.toFixed(3)}s${RESET}`
}

function result(ok, emoji, label, elapsed, detail) {
  stats.total += 1
  stats[ok ? 'ok' : 'fail'] += 1
  const tag = ok ? `${GREEN}✅ 通过${RESET}` : `${RED}❌ 失败${RESET}`
  console.log(`  ${tag}  ${emoji} ${label}  (${colorTime(elapsed)})`)
  if (detail) {
    for (const line of String(detail).split('\n')) {
      console.log(`    ${line}`)
    }
  }
}

function doGet(url) {
  return new Promise((resolve) => {
    const start = Date.now()
    const req = https.get(url, { timeout: 30000 }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8')
        let data = null
        try {
          data = JSON.parse(body)
        } catch (err) {
          data = body
        }
        resolve({ status: res.statusCode, data, elapsed: (Date.now() - start) / 1000, err: null })
      })
    })
    req.on('timeout', () => req.destroy(new Error('请求超时')))
    req.on('error', (err) => {
      resolve({ status: null, data: null, elapsed: (Date.now() - start) / 1000, err: err.message })
    })
  })
}

async function testHealth(base) {
  const { status, data, elapsed, err } = await doGet(`${base}/checkHealth`)
  if (err) return result(false, '🩺', '健康检查', elapsed, err)
  const ok = status === 200 && data && ['ok', 'degraded'].includes(data.status)
  result(ok, '🩺', '健康检查', elapsed, JSON.stringify(data))
}

async function testQuery(base, roleId) {
  const { status, data, elapsed, err } = await doGet(`${base}/queryGuangyi?id=${roleId}`)
  if (err) return result(false, '🪽', `光翼查询 ${roleId}`, elapsed, err)
  const code = data && data.data ? data.data.code : null
  const ok = status === 200 && code === 200
  result(ok, '🪽', `光翼查询 ${roleId}`, elapsed, `HTTP ${status}, data.code=${code}`)
}

async function testCbg(base, uuid) {
  const { status, data, elapsed, err } = await doGet(`${base}/queryCbgInv?id=${uuid}`)
  if (err) return result(false, '🎒', '藏宝阁衣柜', elapsed, err)
  const ok = status === 200 && data && data.success === true
  let detail = `HTTP ${status}`
  if (data) {
    detail += `, total=${data.total}, uniqueTotal=${data.uniqueTotal}`
    if (!ok && data.message) detail += `\n${data.message}`
  }
  result(ok, '🎒', '藏宝阁衣柜', elapsed, detail)
}

async function runLine(name, base, roleId) {
  console.log(`\n${BOLD}${MAGENTA}${'='.repeat(60)}${RESET}`)
  console.log(`${BOLD}${MAGENTA}  🚀 ${name}${RESET}`)
  console.log(`${BOLD}${MAGENTA}  🌐 ${base}${RESET}`)
  console.log(`${BOLD}${MAGENTA}${'='.repeat(60)}${RESET}`)
  await testHealth(base)
  await testQuery(base, roleId)
  await testCbg(base, CBG_UUID)
}

async function main() {
  const roleId = (process.argv[2] || '').trim() || DEFAULT_ROLE_ID
  console.log(`\n${BOLD}${CYAN}目标角色：${roleId}；藏宝阁 UUID：${CBG_UUID}${RESET}`)

  for (const [name, base] of Object.entries(LINES)) {
    await runLine(name, base, roleId)
  }

  const color = stats.fail === 0 ? GREEN : RED
  console.log(`\n${BOLD}${'='.repeat(60)}${RESET}`)
  console.log(`${BOLD}  ${color}汇总: ${stats.ok}/${stats.total} 通过，${stats.fail} 失败${RESET}`)
  console.log(`${BOLD}${'='.repeat(60)}${RESET}\n`)
  process.exitCode = stats.fail === 0 ? 0 : 1
}

main()
