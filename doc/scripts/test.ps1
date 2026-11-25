<#
.SYNOPSIS
    网易大神光翼查询 API - 增强测试客户端 (PowerShell 版)
.DESCRIPTION
    原生 PowerShell 脚本，彩色输出 + emoji，覆盖双线路与全部端点
.PARAMETER RoleId
    光遇玩家角色 ID，可选；若未传入则默认回退到 137106295
#>

param (
    [string]$RoleId = ""
)

$ErrorActionPreference = "Continue"

# ============ ANSI 颜色 ============
$ESC = [char]27
$GREEN = "$ESC[92m"
$RED = "$ESC[91m"
$YELLOW = "$ESC[93m"
$CYAN = "$ESC[96m"
$MAGENTA = "$ESC[95m"
$BOLD = "$ESC[1m"
$RESET = "$ESC[0m"

# ============ 配置 ============
$DEFAULT_ROLE_ID = "137106295"

$LINES = [ordered]@{
    "CF 保护主线路 (推荐)" = "https://cf-guangyi.vincentzyu233.cn"
    "国内直连备用线路"     = "https://guangyi.vincentzyu233.cn"
}

$STATS = @{
    Total = 0
    Ok    = 0
    Fail  = 0
}

function Format-ColorTime([double]$seconds) {
    if ($seconds -lt 0.5) { return "$GREEN$("{0:F3}s" -f $seconds)$RESET" }
    elseif ($seconds -lt 1.0) { return "$YELLOW$("{0:F3}s" -f $seconds)$RESET" }
    else { return "$RED$("{0:F3}s" -f $seconds)$RESET" }
}

function Print-Section([string]$text) {
    Write-Host "`n$CYAN┌─ $text$RESET"
}

function Print-Ok([string]$emoji, [string]$label, [double]$elapsed, [string]$detail = "") {
    $script:STATS.Total += 1
    $script:STATS.Ok += 1
    $timeStr = Format-ColorTime $elapsed
    Write-Host "`n  $GREEN✅ 通过$RESET  $emoji $label  $CYAN($timeStr)$RESET"
    if ($detail) {
        $detail -split "`n" | ForEach-Object { Write-Host "    $_" }
    }
}

function Print-Fail([string]$emoji, [string]$label, [double]$elapsed, [string]$detail = "") {
    $script:STATS.Total += 1
    $script:STATS.Fail += 1
    $timeStr = Format-ColorTime $elapsed
    Write-Host "`n  $RED❌ 失败$RESET  $emoji $label  $CYAN($timeStr)$RESET"
    if ($detail) {
        $detail -split "`n" | ForEach-Object { Write-Host "    $_" }
    }
}

function Invoke-ApiGet([string]$url) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $headers = @{
        "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        "Accept"     = "application/json, text/plain, */*"
    }

    try {
        $resp = Invoke-WebRequest -Uri $url -Headers $headers -TimeoutSec 15 -UseBasicParsing
        $sw.Stop()
        $elapsed = $sw.Elapsed.TotalSeconds
        $data = $null
        try {
            $data = $resp.Content | ConvertFrom-Json
        } catch {
            $data = $resp.Content
        }
        return @{
            StatusCode = [int]$resp.StatusCode
            Data       = $data
            Elapsed    = $elapsed
            Error      = $null
        }
    } catch [System.Net.WebException] {
        $sw.Stop()
        $elapsed = $sw.Elapsed.TotalSeconds
        $res = $_.Exception.Response
        if ($res) {
            $code = [int]$res.StatusCode
            $sr = New-Object System.IO.StreamReader($res.GetResponseStream())
            $body = $sr.ReadToEnd()
            $data = $null
            try { $data = $body | ConvertFrom-Json } catch { $data = $body }
            return @{ StatusCode = $code; Data = $data; Elapsed = $elapsed; Error = $null }
        }
        return @{ StatusCode = $null; Data = $null; Elapsed = $elapsed; Error = $_.Exception.Message }
    } catch {
        $sw.Stop()
        return @{ StatusCode = $null; Data = $null; Elapsed = $sw.Elapsed.TotalSeconds; Error = $_.Exception.Message }
    }
}

# ============ 测试用例 ============

function Test-Root([string]$baseUrl) {
    Print-Section "GET /  — 根路径"
    $r = Invoke-ApiGet "$baseUrl/"
    if ($r.Error) {
        Print-Fail "🏠" "根路径" $r.Elapsed $r.Error
        return $false
    }
    $detail = "🔗 URL: $CYAN$baseUrl/$RESET`n📦 响应: " + ($r.Data | ConvertTo-Json -Compress)
    if ($r.StatusCode -eq 200) {
        Print-Ok "🏠" "根路径" $r.Elapsed $detail
        return $true
    } else {
        Print-Fail "🏠" "根路径" $r.Elapsed $detail
        return $false
    }
}

function Test-Health([string]$baseUrl) {
    Print-Section "GET /checkhealth  — 健康检查"
    $r = Invoke-ApiGet "$baseUrl/checkhealth"
    if ($r.Error) {
        Print-Fail "📊" "健康检查" $r.Elapsed $r.Error
        return $false
    }

    $data = $r.Data
    $checks = $data.checks
    $checkLines = @(
        $(if ($checks.frida_connected) { "  $GREEN✅ 🟢 Frida 连接$RESET" } else { "  $RED❌ 🔴 Frida 断开$RESET" }),
        $(if ($checks.process_found)   { "  $GREEN✅ 🎯 进程发现$RESET" } else { "  $RED❌ 🎯 进程未找到$RESET" }),
        $(if ($checks.script_loaded)   { "  $GREEN✅ 📜 脚本已加载$RESET" } else { "  $RED❌ 📜 脚本未加载$RESET" }),
        $(if ($checks.adb_connected)   { "  $GREEN✅ 📱 ADB 连接$RESET" } else { "  $RED❌ 📱 ADB 断开$RESET" })
    )

    $statusStr = if ($data.status) { $data.status } else { "unknown" }
    $statusColored = if ($statusStr -eq "healthy" -or $statusStr -eq "ok") { "$GREEN$statusStr$RESET" } else { "$RED$statusStr$RESET" }
    $details = $data.details

    $detail = "📊 总体状态: $statusColored`n" +
        ($checkLines -join "`n") + "`n`n" +
        "  📋 详情:`n" +
        "    ADB 路径: $(if ($details.adb_path) { $details.adb_path } else { 'N/A' })`n" +
        "    包名: $(if ($details.package) { $details.package } else { 'N/A' })`n" +
        "    服务器: $(if ($details.server) { $details.server } else { 'N/A' })"

    $ok = ($r.StatusCode -eq 200) -and ($statusStr -eq "healthy" -or $statusStr -eq "ok")
    if ($ok) { Print-Ok "📊" "健康检查" $r.Elapsed $detail; return $true }
    else { Print-Fail "📊" "健康检查" $r.Elapsed $detail; return $false }
}

function Test-Query([string]$baseUrl, [string]$id) {
    Print-Section "GET /queryGuangyi?id=$id  — 查询光翼数据"
    $r = Invoke-ApiGet "$baseUrl/queryGuangyi?id=$id"
    if ($r.Error) {
        Print-Fail "🔍" "查询光翼" $r.Elapsed $r.Error
        return $false
    }

    $lines = @(
        "🔗 URL: $CYAN$baseUrl/queryGuangyi?id=$id$RESET",
        "📦 HTTP 状态码: $($r.StatusCode)"
    )

    if ($r.StatusCode -eq 200) {
        $lines += "`n  $GREEN✅ 请求成功！$RESET"
        if ($r.Data.data) {
            $code = $r.Data.data.code
            $errmsg = $r.Data.data.errmsg
            $lines += "`n  $BOLD📋 响应分析:$RESET"
            $lines += "    状态码: $code"
            $lines += "    错误信息: $errmsg"
            if ($code -eq 200 -or $code -eq 0) {
                $lines += "`n  $GREEN✅ 查询成功，数据正常！$RESET"
            } else {
                $lines += "`n  $RED❌ 查询失败，错误码: $code$RESET"
            }
        }
    } else {
        $lines += "`n  $RED❌ 请求失败$RESET"
    }

    $ok = ($r.StatusCode -eq 200)
    if ($ok) { Print-Ok "🔍" "查询光翼" $r.Elapsed ($lines -join "`n"); return $true }
    else { Print-Fail "🔍" "查询光翼" $r.Elapsed ($lines -join "`n"); return $false }
}

function Test-RefreshToken([string]$baseUrl) {
    Print-Section "GET /refreshToken  — 刷新 Token (安全策略验证)"
    $r = Invoke-ApiGet "$baseUrl/refreshToken"

    $lines = @("🔗 URL: $CYAN$baseUrl/refreshToken$RESET")

    if ($r.StatusCode -eq 403) {
        $lines += "`n  $GREEN🛡️  生产安全策略正常：外网刷新端点已被成功防护 (403 Forbidden)$RESET"
        Print-Ok "🛡️" "刷新 Token 安全拦截" $r.Elapsed ($lines -join "`n")
        return $true
    }

    if ($r.StatusCode -eq 200 -and $r.Data.success) {
        $lines += "`n  $GREEN✅ Token 刷新成功！$RESET"
        Print-Ok "⚡" "刷新 Token" $r.Elapsed ($lines -join "`n")
        return $true
    } else {
        $lines += "`n  $RED❌ Token 刷新端点返回异常$RESET"
        Print-Fail "⚡" "刷新 Token" $r.Elapsed ($lines -join "`n")
        return $false
    }
}

# ============ 主入口 ============

Write-Host "`n$BOLD$CYAN$('#' * 60)$RESET"
Write-Host "$BOLD$CYAN  🔥  网易大神光翼查询 API — 综合连通性测试 (PowerShell 版)$RESET"
Write-Host "$BOLD$CYAN$('#' * 60)$RESET"

if ($RoleId -and $RoleId.Trim()) {
    $RoleId = $RoleId.Trim()
    Write-Host "`n$BOLD$GREEN🎯 使用传入的玩家角色 ID: $RoleId$RESET"
} else {
    $RoleId = $DEFAULT_ROLE_ID
    Write-Host "`n$BOLD$YELLOW⚠️  提示: 命令行未传入玩家角色 ID，Fallback 回退到默认真实玩家 ID: $CYAN$RoleId$RESET"
}

$allPassed = $true

foreach ($entry in $LINES.GetEnumerator()) {
    $name = $entry.Key
    $url = $entry.Value

    Write-Host "`n$BOLD$MAGENTA$('=' * 60)$RESET"
    Write-Host "$BOLD$MAGENTA  🚀  测试线路: $name$RESET"
    Write-Host "$BOLD$MAGENTA  🌐  $url$RESET"
    Write-Host "$BOLD$MAGENTA$('=' * 60)$RESET"

    $res1 = Test-Root $url
    $res2 = Test-Health $url
    $res3 = Test-Query $url $RoleId
    $res4 = Test-RefreshToken $url

    if (-not ($res1 -and $res2 -and $res3 -and $res4)) {
        $allPassed = $false
    }
}

Write-Host "`n$BOLD$('=' * 60)$RESET"
$total = $STATS.Total
$ok = $STATS.Ok
$fail = $STATS.Fail
$sc = if ($fail -eq 0) { $GREEN } else { $RED }
$icon = if ($fail -eq 0) { "🎉" } else { "😢" }
Write-Host "$BOLD  $icon  双线测试汇总: $sc$ok/$total 通过$RESET"
if ($fail -gt 0) {
    Write-Host "$BOLD  $RED  $fail 项失败$RESET"
}
Write-Host "$BOLD$('=' * 60)$RESET`n"

if ($allPassed) { exit 0 } else { exit 1 }
