# 网易大神光翼 / 藏宝阁衣柜 API 连通性测试 (PowerShell 版)
# 只覆盖 3 个公网接口：/checkHealth、/queryGuangyi、/queryCbgInv

[CmdletBinding()]
param([string]$RoleId = "380594330")

$ErrorActionPreference = "Stop"
$CbgUuid = "37ec67d8-b55b-4cb3-b124-b20b67a98a10"
$Lines = [ordered]@{
    "CF 保护主线路 (推荐)" = "https://cf-guangyi.vincentzyu233.cn"
    "国内直连备用线路"     = "https://guangyi.vincentzyu233.cn"
}
$Stats = @{ total = 0; ok = 0; fail = 0 }

function Write-Result {
    param($Ok, $Emoji, $Label, $Elapsed, $Detail)
    $script:Stats.total++
    if ($Ok) {
        $script:Stats.ok++
        $tag = "✅ 通过"
    } else {
        $script:Stats.fail++
        $tag = "❌ 失败"
    }
    Write-Host ("  {0}  {1} {2}  ({3:N3}s)" -f $tag, $Emoji, $Label, $Elapsed)
    if ($Detail) {
        foreach ($line in ("$Detail" -split "`n")) {
            Write-Host "    $line"
        }
    }
}

function Get-Api {
    param([string]$Url)
    $start = Get-Date
    try {
        $resp = Invoke-WebRequest -Uri $Url -TimeoutSec 30 -UseBasicParsing -ErrorAction Stop
        $elapsed = ((Get-Date) - $start).TotalSeconds
        $data = $resp.Content | ConvertFrom-Json
        return @{ Status = [int]$resp.StatusCode; Data = $data; Elapsed = $elapsed; Error = $null }
    } catch {
        $elapsed = ((Get-Date) - $start).TotalSeconds
        $status = $null
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        }
        return @{ Status = $status; Data = $null; Elapsed = $elapsed; Error = $_.Exception.Message }
    }
}

function Test-Health {
    param([string]$Base)
    $r = Get-Api "$Base/checkHealth"
    if ($r.Error) {
        Write-Result $false "🩺" "健康检查" $r.Elapsed $r.Error
        return
    }
    $ok = $r.Status -eq 200 -and $r.Data.status -in @("ok", "degraded")
    Write-Result $ok "🩺" "健康检查" $r.Elapsed ($r.Data | ConvertTo-Json -Compress -Depth 5)
}

function Test-Query {
    param([string]$Base, [string]$Role)
    $r = Get-Api "$Base/queryGuangyi?id=$Role"
    if ($r.Error) {
        Write-Result $false "🪽" "光翼查询 $Role" $r.Elapsed $r.Error
        return
    }
    $code = $r.Data.data.code
    $ok = $r.Status -eq 200 -and $code -eq 200
    Write-Result $ok "🪽" "光翼查询 $Role" $r.Elapsed ("HTTP {0}, data.code={1}" -f $r.Status, $code)
}

function Test-Cbg {
    param([string]$Base, [string]$Uuid)
    $r = Get-Api "$Base/queryCbgInv?id=$Uuid"
    if ($r.Error) {
        Write-Result $false "🎒" "藏宝阁衣柜" $r.Elapsed $r.Error
        return
    }
    $ok = $r.Status -eq 200 -and $r.Data.success -eq $true
    $detail = "HTTP {0}, total={1}, uniqueTotal={2}" -f $r.Status, $r.Data.total, $r.Data.uniqueTotal
    if (-not $ok -and $r.Data.message) {
        $detail += "`n$($r.Data.message)"
    }
    Write-Result $ok "🎒" "藏宝阁衣柜" $r.Elapsed $detail
}

function Invoke-Line {
    param([string]$Name, [string]$Base, [string]$Role)
    Write-Host ""
    Write-Host ("=" * 60)
    Write-Host "  🚀 $Name"
    Write-Host "  🌐 $Base"
    Write-Host ("=" * 60)
    Test-Health $Base
    Test-Query $Base $Role
    Test-Cbg $Base $CbgUuid
}

Write-Host ""
Write-Host "目标角色：$RoleId；藏宝阁 UUID：$CbgUuid"

foreach ($entry in $Lines.GetEnumerator()) {
    Invoke-Line $entry.Key $entry.Value $RoleId
}

Write-Host ""
Write-Host ("=" * 60)
Write-Host ("  汇总: {0}/{1} 通过，{2} 失败" -f $Stats.ok, $Stats.total, $Stats.fail)
Write-Host ("=" * 60)

if ($Stats.fail -gt 0) { exit 1 } else { exit 0 }
