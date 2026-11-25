#!/usr/bin/env bash
# ========================================================
# 网易大神光翼查询 API - 增强测试客户端 (Bash 版)
# 纯 Shell + curl，彩色输出 + emoji，覆盖双线路与全部端点
# ========================================================

set -o pipefail 2>/dev/null || true

# ANSI 颜色
GREEN="\033[92m"
RED="\033[91m"
YELLOW="\033[93m"
CYAN="\033[96m"
MAGENTA="\033[95m"
BOLD="\033[1m"
RESET="\033[0m"

DEFAULT_ROLE_ID="137106295"
ROLE_ID="$1"

TOTAL=0
OK=0
FAIL=0

UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

print_header() {
    printf "\n${BOLD}${MAGENTA}============================================================${RESET}\n"
    printf "${BOLD}${MAGENTA}  %s${RESET}\n" "$1"
    printf "${BOLD}${MAGENTA}============================================================${RESET}\n"
}

print_section() {
    printf "\n${CYAN}┌─ %s${RESET}\n" "$1"
}

format_time() {
    local t=$1
    printf "${GREEN}%ss${RESET}" "$t"
}

print_ok() {
    local emoji="$1"
    local label="$2"
    local elapsed="$3"
    local detail="$4"
    TOTAL=$((TOTAL + 1))
    OK=$((OK + 1))
    printf "\n  ${GREEN}✅ 通过${RESET}  %s %s  ${CYAN}(%ss)${RESET}\n" "$emoji" "$label" "$elapsed"
    if [ -n "$detail" ]; then
        printf "%s\n" "$detail" | sed 's/^/    /'
    fi
}

print_fail() {
    local emoji="$1"
    local label="$2"
    local elapsed="$3"
    local detail="$4"
    TOTAL=$((TOTAL + 1))
    FAIL=$((FAIL + 1))
    printf "\n  ${RED}❌ 失败${RESET}  %s %s  ${CYAN}(%ss)${RESET}\n" "$emoji" "$label" "$elapsed"
    if [ -n "$detail" ]; then
        printf "%s\n" "$detail" | sed 's/^/    /'
    fi
}

# 格式化 JSON 工具
format_json() {
    if command -v jq >/dev/null 2>&1; then
        echo "$1" | jq . 2>/dev/null || echo "$1"
    else
        echo "$1"
    fi
}

test_endpoint() {
    local base_url="$1"
    local name="$2"

    print_header "🚀  测试线路: $name"
    printf "${BOLD}${MAGENTA}  🌐  %s${RESET}\n" "$base_url"

    # 1. 根路径
    print_section "GET /  — 根路径"
    local start_t
    start_t=$(date +%s%3N 2>/dev/null || date +%s)
    local resp
    resp=$(curl -s -w "\n%{http_code}\n%{time_total}" -A "$UA" -m 15 "$base_url/")
    local code
    code=$(echo "$resp" | tail -n 2 | head -n 1)
    local elapsed
    elapsed=$(echo "$resp" | tail -n 1)
    local body
    body=$(echo "$resp" | sed '$d' | sed '$d')

    if [ "$code" = "200" ]; then
        print_ok "🏠" "根路径" "$elapsed" "🔗 URL: ${CYAN}${base_url}/${RESET}\n📦 响应: $(echo "$body" | tr -d '\n' | cut -c 1-120)..."
    else
        print_fail "🏠" "根路径" "$elapsed" "HTTP $code\n$body"
    fi

    # 2. 健康检查
    print_section "GET /checkhealth  — 健康检查"
    resp=$(curl -s -w "\n%{http_code}\n%{time_total}" -A "$UA" -m 15 "$base_url/checkhealth")
    code=$(echo "$resp" | tail -n 2 | head -n 1)
    elapsed=$(echo "$resp" | tail -n 1)
    body=$(echo "$resp" | sed '$d' | sed '$d')

    if [ "$code" = "200" ]; then
        print_ok "📊" "健康检查" "$elapsed" "总体状态: ${GREEN}正常 (200 OK)${RESET}\n$(echo "$body" | tr -d '\n' | cut -c 1-120)..."
    else
        print_fail "📊" "健康检查" "$elapsed" "HTTP $code\n$body"
    fi

    # 3. 光翼查询
    print_section "GET /queryGuangyi?id=$ROLE_ID  — 查询光翼数据"
    resp=$(curl -s -w "\n%{http_code}\n%{time_total}" -A "$UA" -m 20 "$base_url/queryGuangyi?id=$ROLE_ID")
    code=$(echo "$resp" | tail -n 2 | head -n 1)
    elapsed=$(echo "$resp" | tail -n 1)
    body=$(echo "$resp" | sed '$d' | sed '$d')

    if [ "$code" = "200" ]; then
        print_ok "🔍" "查询光翼" "$elapsed" "🔗 URL: ${CYAN}${base_url}/queryGuangyi?id=${ROLE_ID}${RESET}\n${GREEN}✅ 请求成功！角色数据正常返回${RESET}"
    else
        print_fail "🔍" "查询光翼" "$elapsed" "HTTP $code\n$body"
    fi

    # 4. 刷新 Token (安全拦截验证)
    print_section "GET /refreshToken  — 刷新 Token (安全策略验证)"
    resp=$(curl -s -w "\n%{http_code}\n%{time_total}" -A "$UA" -m 15 "$base_url/refreshToken")
    code=$(echo "$resp" | tail -n 2 | head -n 1)
    elapsed=$(echo "$resp" | tail -n 1)
    body=$(echo "$resp" | sed '$d' | sed '$d')

    if [ "$code" = "403" ]; then
        print_ok "🛡️" "刷新 Token 安全拦截" "$elapsed" "${GREEN}🛡️ 生产安全策略正常：外网刷新端点已被成功防护 (403 Forbidden)${RESET}"
    elif [ "$code" = "200" ]; then
        print_ok "⚡" "刷新 Token" "$elapsed" "Token 刷新成功"
    else
        print_fail "⚡" "刷新 Token" "$elapsed" "非预期状态 HTTP $code"
    fi
}

main() {
    printf "\n${BOLD}${CYAN}############################################################${RESET}\n"
    printf "${BOLD}${CYAN}  🔥  网易大神光翼查询 API — 综合连通性测试 (Bash 版)${RESET}\n"
    printf "${BOLD}${CYAN}############################################################${RESET}\n"

    if [ -n "$ROLE_ID" ]; then
        printf "\n${BOLD}${GREEN}🎯 使用传入的玩家角色 ID: %s${RESET}\n" "$ROLE_ID"
    else
        ROLE_ID="$DEFAULT_ROLE_ID"
        printf "\n${BOLD}${YELLOW}⚠️  提示: 命令行未传入玩家角色 ID，Fallback 回退到默认真实玩家 ID: ${CYAN}%s${RESET}\n" "$ROLE_ID"
    fi

    test_endpoint "https://cf-guangyi.vincentzyu233.cn" "CF 保护主线路 (推荐)"
    test_endpoint "https://guangyi.vincentzyu233.cn" "国内直连备用线路"

    printf "\n${BOLD}============================================================${RESET}\n"
    if [ "$FAIL" -eq 0 ]; then
        printf "${BOLD}  🎉  双线测试汇总: ${GREEN}%d/%d 通过${RESET}\n" "$OK" "$TOTAL"
    else
        printf "${BOLD}  😢  双线测试汇总: ${RED}%d/%d 通过 (%d 项失败)${RESET}\n" "$OK" "$TOTAL" "$FAIL"
    fi
    printf "${BOLD}============================================================${RESET}\n\n"

    [ "$FAIL" -eq 0 ]
}

main
