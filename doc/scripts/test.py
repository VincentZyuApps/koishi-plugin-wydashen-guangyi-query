"""
网易大神光翼查询 API - 增强测试客户端
纯内置库，彩色输出 + emoji，覆盖全部端点
"""

import json
import time
import sys
import urllib.request
import urllib.error

# ============ ANSI 颜色 ============
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
MAGENTA = "\033[95m"
BOLD = "\033[1m"
RESET = "\033[0m"

# ============ 配置 ============
BASE_URL = "http://bluerosion.vincentzyu233.cn:51024"

# ============ 统计 ============
STATS = {"total": 0, "ok": 0, "fail": 0}


def color_time(seconds):
    if seconds < 0.5:
        return f"{GREEN}{seconds:.3f}s{RESET}"
    elif seconds < 1.0:
        return f"{YELLOW}{seconds:.3f}s{RESET}"
    else:
        return f"{RED}{seconds:.3f}s{RESET}"


def print_header(text):
    print(f"\n{BOLD}{MAGENTA}{'=' * 60}{RESET}")
    print(f"{BOLD}{MAGENTA}  {text}{RESET}")
    print(f"{BOLD}{MAGENTA}{'=' * 60}{RESET}")


def print_section(text):
    print(f"\n{CYAN}┌─ {text}{RESET}")


def print_ok(emoji, label, elapsed, detail=None):
    STATS["total"] += 1
    STATS["ok"] += 1
    print(
        f"\n  {GREEN}✅ 通过{RESET}  {emoji} {label}  {CYAN}({color_time(elapsed)}){RESET}"
    )
    if detail:
        for line in detail.split("\n"):
            print(f"    {line}")


def print_fail(emoji, label, elapsed, detail=None):
    STATS["total"] += 1
    STATS["fail"] += 1
    print(
        f"\n  {RED}❌ 失败{RESET}  {emoji} {label}  {CYAN}({color_time(elapsed)}){RESET}"
    )
    if detail:
        for line in detail.split("\n"):
            print(f"    {line}")


def json_dumps(obj):
    return json.dumps(obj, indent=2, ensure_ascii=False)


# ============ HTTP 请求（纯内置） ============


def do_get(url):
    start = time.time()
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8")
            elapsed = time.time() - start
            return resp.status, json.loads(body), elapsed, None
    except urllib.error.HTTPError as e:
        elapsed = time.time() - start
        try:
            body = e.read().decode("utf-8")
            detail = json.loads(body)
        except Exception:
            detail = str(e)
        return e.code, detail, elapsed, None
    except urllib.error.URLError as e:
        elapsed = time.time() - start
        return None, None, elapsed, f"❌ 连接失败: {e.reason}"
    except Exception as e:
        elapsed = time.time() - start
        return None, None, elapsed, f"💥 异常: {e}"


# ============ 测试函数 ============


def test_root():
    print_section("GET /  — 根路径")
    status, data, elapsed, err = do_get(f"{BASE_URL}/")

    if err:
        print_fail("🏠", "根路径", elapsed, err)
        return False

    detail = f"🔗 URL: {CYAN}{BASE_URL}/{RESET}\n📦 响应: {json_dumps(data)}"
    ok = status == 200
    if ok:
        print_ok("🏠", "根路径", elapsed, detail)
    else:
        print_fail("🏠", "根路径", elapsed, detail)
    return ok


def test_health():
    print_section("GET /checkhealth  — 健康检查")
    status, data, elapsed, err = do_get(f"{BASE_URL}/checkhealth")

    if err:
        print_fail("📊", "健康检查", elapsed, err)
        return False

    checks = data.get("checks", {})
    check_lines = []
    check_map = {
        "frida_connected": ("🟢 Frida 连接", "🔴 Frida 断开"),
        "process_found": ("🎯 进程发现", "🎯 进程未找到"),
        "script_loaded": ("📜 脚本已加载", "📜 脚本未加载"),
        "adb_connected": ("📱 ADB 连接", "📱 ADB 断开"),
    }
    for key, (ok_text, fail_text) in check_map.items():
        val = checks.get(key, False)
        if val:
            check_lines.append(f"  {GREEN}✅ {ok_text}{RESET}")
        else:
            check_lines.append(f"  {RED}❌ {fail_text}{RESET}")

    details = data.get("details", {})
    status_str = data.get("status", "unknown")
    status_colored = (
        f"{GREEN}{status_str}{RESET}"
        if status_str == "healthy"
        else f"{RED}{status_str}{RESET}"
    )

    detail = (
        f"📊 总体状态: {status_colored}\n"
        + "\n".join(check_lines)
        + "\n"
        + f"\n  📋 详情:\n"
        + f"    ADB 路径: {details.get('adb_path', 'N/A')}\n"
        + f"    包名: {details.get('package', 'N/A')}\n"
        + f"    服务器: {details.get('server', 'N/A')}"
    )

    ok = status == 200 and data.get("status") == "healthy"
    if ok:
        print_ok("📊", "健康检查", elapsed, detail)
    else:
        print_fail("📊", "健康检查", elapsed, detail)
    return ok


def test_query(role_id="137106295"):
    print_section(f"GET /queryGuangyi?id={role_id}  — 查询光翼数据")
    status, data, elapsed, err = do_get(f"{BASE_URL}/queryGuangyi?id={role_id}")

    if err:
        print_fail("🔍", "查询光翼", elapsed, err)
        return False

    lines = [f"🔗 URL: {CYAN}{BASE_URL}/queryGuangyi?id={role_id}{RESET}"]
    lines.append(f"📦 HTTP 状态码: {status}")

    if status == 200:
        lines.append(f"\n  {GREEN}✅ 请求成功！{RESET}")

        if "signedUrl" in data:
            lines.append(f"\n  {BOLD}🔐 签名 URL:{RESET}")
            lines.append(f"    {CYAN}{data['signedUrl']}{RESET}")

        if "requestBody" in data:
            lines.append(f"\n  {BOLD}📤 请求体:{RESET}")
            for line in json_dumps(data["requestBody"]).split("\n"):
                lines.append(f"    {line}")

        if "data" in data:
            lines.append(f"\n  {BOLD}📥 服务器响应:{RESET}")
            for line in json_dumps(data["data"]).split("\n"):
                lines.append(f"    {line}")

            resp_data = data["data"]
            if isinstance(resp_data, dict) and "code" in resp_data:
                code = resp_data["code"]
                errmsg = resp_data.get("errmsg", "")
                lines.append(f"\n  {BOLD}📋 响应分析:{RESET}")
                lines.append(f"    状态码: {code}")
                lines.append(f"    错误信息: {errmsg}")

                if code == 803:
                    lines.append(f"\n  {YELLOW}⚠️  参数错误！可能的原因:{RESET}")
                    lines.append(f"    1. 角色 ID 格式不正确")
                    lines.append(f"    2. 服务器 ID 不匹配")
                    lines.append(f"    3. 缺少必要的请求头")
                    lines.append(f"    4. 签名参数有误")
                elif code == 200 or code == 0:
                    lines.append(f"\n  {GREEN}✅ 查询成功，数据正常！{RESET}")
                else:
                    lines.append(f"\n  {RED}❌ 查询失败，错误码: {code}{RESET}")
    else:
        lines.append(f"\n  {RED}❌ 请求失败{RESET}")
        lines.append(f"  {json_dumps(data)}")

    ok = status == 200 and data.get("success", False)
    if ok:
        print_ok("🔍", "查询光翼", elapsed, "\n".join(lines))
    else:
        print_fail("🔍", "查询光翼", elapsed, "\n".join(lines))
    return ok


def test_refresh_token():
    print_section("GET /refreshToken  — 刷新 Token")
    status, data, elapsed, err = do_get(f"{BASE_URL}/refreshToken")

    if err:
        print_fail("⚡", "刷新 Token", elapsed, err)
        return False

    lines = [f"🔗 URL: {CYAN}{BASE_URL}/refreshToken{RESET}"]

    if status == 200 and data.get("success"):
        lines.append(f"\n  {GREEN}✅ Token 刷新成功！{RESET}")
        if data.get("token_preview"):
            lines.append(f"\n  🔑 Token 预览: {CYAN}{data['token_preview']}{RESET}")
        if data.get("uid"):
            lines.append(f"  👤 UID: {YELLOW}{data['uid']}{RESET}")
        if data.get("last_refresh_at"):
            lines.append(f"  ⏱️  上次刷新: {data['last_refresh_at']}")
        if data.get("message"):
            lines.append(f"  💬 消息: {data['message']}")
    else:
        err_msg = data.get("message", data.get("detail", "未知错误"))
        lines.append(f"\n  {RED}❌ Token 刷新失败{RESET}")
        lines.append(f"  💬 {err_msg}")

    ok = status == 200 and data.get("success", False)
    if ok:
        print_ok("⚡", "刷新 Token", elapsed, "\n".join(lines))
    else:
        print_fail("⚡", "刷新 Token", elapsed, "\n".join(lines))
    return ok


# ============ 主流程 ============


def main():
    print(f"\n{BOLD}{MAGENTA}{'=' * 60}{RESET}")
    print(f"{BOLD}{MAGENTA}  🚀  网易大神光翼查询 API — 增强测试客户端{RESET}")
    print(f"{BOLD}{MAGENTA}  🌐  {BASE_URL}{RESET}")
    print(f"{BOLD}{MAGENTA}{'=' * 60}{RESET}\n")

    results = []
    try:
        results.append(test_root())
        results.append(test_health())
        results.append(test_query("137106295"))
        results.append(test_refresh_token())
    except KeyboardInterrupt:
        print(f"\n{YELLOW}⚠️  用户中断{RESET}")

    # 汇总
    print(f"\n{BOLD}{'=' * 60}{RESET}")
    total = STATS["total"]
    ok = STATS["ok"]
    fail = STATS["fail"]
    if fail == 0:
        sc = GREEN
        icon = "🎉"
    else:
        sc = RED
        icon = "😢"
    print(f"{BOLD}  {icon}  测试汇总: {sc}{ok}/{total} 通过{RESET}")
    if fail > 0:
        print(f"{BOLD}  {RED}  {fail} 项失败{RESET}")
    print(f"{BOLD}{'=' * 60}{RESET}\n")

    return fail == 0


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
