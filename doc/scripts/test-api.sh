#!/usr/bin/env bash
# 网易大神光翼 / 藏宝阁衣柜 API 连通性测试 (Bash 版)
# 只覆盖 3 个公网接口：/checkHealth、/queryGuangyi、/queryCbgInv

set -u

GREEN=$'\033[92m'
RED=$'\033[91m'
CYAN=$'\033[96m'
MAGENTA=$'\033[95m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

ROLE_ID="${1:-380594330}"
CBG_UUID="37ec67d8-b55b-4cb3-b124-b20b67a98a10"

STATS_TOTAL=0
STATS_OK=0
STATS_FAIL=0

result() {
    local ok=$1 emoji=$2 label=$3 elapsed=$4 detail=$5
    STATS_TOTAL=$((STATS_TOTAL + 1))
    if [ "$ok" = "1" ]; then
        STATS_OK=$((STATS_OK + 1))
        tag="${GREEN}✅ 通过${RESET}"
    else
        STATS_FAIL=$((STATS_FAIL + 1))
        tag="${RED}❌ 失败${RESET}"
    fi
    printf "  %s  %s %s  (%ss)\n" "$tag" "$emoji" "$label" "$elapsed"
    if [ -n "$detail" ]; then
        printf "    %s\n" "$detail"
    fi
}

timed_ms() {
    local start=$1
    echo $(( ($(date +%s%N) - start) / 1000000 ))
}

test_health() {
    local base=$1
    local url="$base/checkHealth"
    local start=$(date +%s%N)
    local code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$url")
    local ms=$(timed_ms "$start")
    local body=$(curl -s --max-time 30 "$url")
    local status=$(printf '%s' "$body" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    local ok=0
    if [ "$code" = "200" ] && { [ "$status" = "ok" ] || [ "$status" = "degraded" ]; }; then
        ok=1
    fi
    result "$ok" "🩺" "健康检查" "$(awk "BEGIN{printf \"%.3f\", $ms/1000}")" "$body"
}

test_query() {
    local base=$1 role=$2
    local url="$base/queryGuangyi?id=$role"
    local start=$(date +%s%N)
    local code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$url")
    local ms=$(timed_ms "$start")
    local body=$(curl -s --max-time 30 "$url")
    local ok=0
    if [ "$code" = "200" ] && printf '%s' "$body" | grep -q '"code":200'; then
        ok=1
    fi
    result "$ok" "🪽" "光翼查询 $role" "$(awk "BEGIN{printf \"%.3f\", $ms/1000}")" "HTTP $code"
}

test_cbg() {
    local base=$1 uuid=$2
    local url="$base/queryCbgInv?id=$uuid"
    local start=$(date +%s%N)
    local code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$url")
    local ms=$(timed_ms "$start")
    local body=$(curl -s --max-time 30 "$url")
    local ok=0
    if [ "$code" = "200" ] && printf '%s' "$body" | grep -q '"success":true'; then
        ok=1
    fi
    result "$ok" "🎒" "藏宝阁衣柜" "$(awk "BEGIN{printf \"%.3f\", $ms/1000}")" "$body"
}

run_line() {
    local name=$1 base=$2
    printf "\n%s%s============================================================%s\n" "$BOLD" "$MAGENTA" "$RESET"
    printf "%s%s  🚀 %s%s\n" "$BOLD" "$MAGENTA" "$name" "$RESET"
    printf "%s%s  🌐 %s%s\n" "$BOLD" "$MAGENTA" "$base" "$RESET"
    printf "%s%s============================================================%s\n" "$BOLD" "$MAGENTA" "$RESET"
    test_health "$base"
    test_query "$base" "$ROLE_ID"
    test_cbg "$base" "$CBG_UUID"
}

printf "\n目标角色：%s；藏宝阁 UUID：%s\n" "$ROLE_ID" "$CBG_UUID"

run_line "CF 保护主线路 (推荐)" "https://cf-guangyi.vincentzyu233.cn"
run_line "国内直连备用线路" "https://guangyi.vincentzyu233.cn"

printf "\n%s============================================================%s\n" "$BOLD" "$RESET"
printf "%s  汇总: %s/%s 通过，%s 失败%s\n" "$BOLD" "$STATS_OK" "$STATS_TOTAL" "$STATS_FAIL" "$RESET"
printf "%s============================================================%s\n\n" "$BOLD" "$RESET"

if [ "$STATS_FAIL" -gt 0 ]; then
    exit 1
fi
exit 0
