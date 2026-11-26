"""
网易大神光翼 / 藏宝阁衣柜 API 连通性测试 (Python 版)

只覆盖 3 个公网接口：
  /checkHealth
  /queryGuangyi?id=<短ID>
  /queryCbgInv?id=<UUID>
"""

import json
import sys
import time
import urllib.error
import urllib.request

# ============ ANSI 颜色 ============
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
MAGENTA = "\033[95m"
BOLD = "\033[1m"
RESET = "\033[0m"

# ============ 配置 ============
DEFAULT_ROLE_ID = "380594330"
CBG_UUID = "37ec67d8-b55b-4cb3-b124-b20b67a98a10"

LINES = {
    "CF 保护主线路 (推荐)": "https://cf-guangyi.vincentzyu233.cn",
    "国内直连备用线路": "https://guangyi.vincentzyu233.cn",
}

STATS = {"total": 0, "ok": 0, "fail": 0}


# ============ 工具 ============
def color_time(seconds):
    if seconds < 0.5:
        return f"{GREEN}{seconds:.3f}s{RESET}"
    if seconds < 1.0:
        return f"{CYAN}{seconds:.3f}s{RESET}"
    return f"{MAGENTA}{seconds:.3f}s{RESET}"


def result(ok, emoji, label, elapsed, detail=None):
    STATS["total"] += 1
    STATS["ok" if ok else "fail"] += 1
    tag = f"{GREEN}✅ 通过{RESET}" if ok else f"{RED}❌ 失败{RESET}"
    print(f"  {tag}  {emoji} {label}  ({color_time(elapsed)})")
    if detail:
        for line in detail.split("\n"):
            print(f"    {line}")


def do_get(url):
    start = time.time()
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body), time.time() - start, None
    except urllib.error.HTTPError as exc:
        elapsed = time.time() - start
        try:
            detail = json.loads(exc.read().decode("utf-8"))
        except Exception:
            detail = str(exc)
        return exc.code, detail, elapsed, None
    except Exception as exc:
        return None, None, time.time() - start, str(exc)


def test_health(base):
    status, data, elapsed, err = do_get(f"{base}/checkHealth")
    if err:
        result(False, "🩺", "健康检查", elapsed, err)
        return
    ok = status == 200 and isinstance(data, dict) and data.get("status") in (
        "ok",
        "degraded",
    )
    detail = json.dumps(data, ensure_ascii=False) if isinstance(data, dict) else str(data)
    result(ok, "🩺", "健康检查", elapsed, detail)


def test_query(base, role_id):
    status, data, elapsed, err = do_get(f"{base}/queryGuangyi?id={role_id}")
    if err:
        result(False, "🪽", f"光翼查询 {role_id}", elapsed, err)
        return
    code = (data.get("data") or {}).get("code") if isinstance(data, dict) else None
    ok = status == 200 and isinstance(data, dict) and code == 200
    detail = f"HTTP {status}, data.code={code}"
    result(ok, "🪽", f"光翼查询 {role_id}", elapsed, detail)


def test_cbg(base, uuid):
    status, data, elapsed, err = do_get(f"{base}/queryCbgInv?id={uuid}")
    if err:
        result(False, "🎒", "藏宝阁衣柜", elapsed, err)
        return
    ok = status == 200 and isinstance(data, dict) and data.get("success") is True
    detail = f"HTTP {status}"
    if isinstance(data, dict):
        detail += f", total={data.get('total')}, uniqueTotal={data.get('uniqueTotal')}"
        if not ok and data.get("message"):
            detail += f"\n{data['message']}"
    result(ok, "🎒", "藏宝阁衣柜", elapsed, detail)


# ============ 主流程 ============
def run_line(name, base, role_id):
    print(f"\n{BOLD}{MAGENTA}{'=' * 60}{RESET}")
    print(f"{BOLD}{MAGENTA}  🚀 {name}{RESET}")
    print(f"{BOLD}{MAGENTA}  🌐 {base}{RESET}")
    print(f"{BOLD}{MAGENTA}{'=' * 60}{RESET}")
    test_health(base)
    test_query(base, role_id)
    test_cbg(base, CBG_UUID)


def main():
    role_id = sys.argv[1].strip() if len(sys.argv) > 1 and sys.argv[1].strip() else DEFAULT_ROLE_ID
    print(f"\n{BOLD}{CYAN}目标角色：{role_id}；藏宝阁 UUID：{CBG_UUID}{RESET}")

    try:
        for name, base in LINES.items():
            run_line(name, base, role_id)
    except KeyboardInterrupt:
        print(f"\n{YELLOW}⚠️  用户中断{RESET}")

    total = STATS["total"]
    ok = STATS["ok"]
    fail = STATS["fail"]
    color = GREEN if fail == 0 else RED
    print(f"\n{BOLD}{'=' * 60}{RESET}")
    print(f"{BOLD}  {color}汇总: {ok}/{total} 通过，{fail} 失败{RESET}")
    print(f"{BOLD}{'=' * 60}{RESET}\n")
    return fail == 0


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
