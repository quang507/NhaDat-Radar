# Tu dong deploy web tren may 146 (thay Vercel, 20/11/2026). Task "Radar Web deploy" chay moi 5 phut (SYSTEM).
#   git fetch -> co commit moi tren main? -> neu chi doi crawler/docs thi chi cap nhat ma, KHONG build
#   -> neu doi file web: (npm ci khi package-lock doi) -> dung server -> npm run build -> chay lai -> thu 127.0.0.1:3000
#   -> that bai thi tra lai ban .next cu, chay lai server, nhan Telegram.
# Danh sach "file web" khop scripts/vercel-bo-qua.sh. Chay tay: powershell -File deploy_web.ps1 -Ep   (ep build du khong co commit moi)
param([switch]$Ep)
$ErrorActionPreference = 'Continue'
$repo = 'C:\radar-web\NhaDat-Radar'
$log = 'C:\radar-web\logs\deploy.log'
$env:PATH = 'C:\Program Files\nodejs;C:\Program Files\Git\cmd;' + $env:PATH
$env:NODE_OPTIONS = '--max-old-space-size=3072'

function Ghi($m) { ('{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m) | Add-Content -Path $log -Encoding UTF8 }
function BaoTelegram($m) {
  try {
    $e = @{}
    Get-Content "$repo\.env.production.local" -Encoding UTF8 | ForEach-Object { if ($_ -match '^(TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID)=(.*)$') { $e[$matches[1]] = $matches[2] } }
    if ($e.TELEGRAM_BOT_TOKEN -and $e.TELEGRAM_CHAT_ID) {
      Invoke-RestMethod -Method Post -Uri ('https://api.telegram.org/bot{0}/sendMessage' -f $e.TELEGRAM_BOT_TOKEN) -Body @{ chat_id = $e.TELEGRAM_CHAT_ID; text = $m } | Out-Null
    }
  } catch { Ghi ('khong gui duoc Telegram: ' + $_.Exception.Message) }
}
function ThuTrang() {
  for ($i = 0; $i -lt 24; $i++) {
    try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/' -UseBasicParsing -TimeoutSec 20; if ($r.StatusCode -eq 200) { return $true } } catch { }
    Start-Sleep -Seconds 5
  }
  return $false
}

$mutex = New-Object System.Threading.Mutex($false, 'Global\RadarWebDeploy')
if (-not $mutex.WaitOne(0)) { exit 0 }
try {
  if ((Test-Path $log) -and ((Get-Item $log).Length -gt 5MB)) { Move-Item $log "$log.old" -Force }
  if ((Test-Path 'C:\radar-web\logs\web.log') -and ((Get-Item 'C:\radar-web\logs\web.log').Length -gt 50MB)) { Move-Item 'C:\radar-web\logs\web.log' 'C:\radar-web\logs\web.log.old' -Force }
  Set-Location $repo
  git fetch origin main 2>&1 | Out-Null
  $cu = (git rev-parse HEAD).Trim()
  $moi = (git rev-parse origin/main).Trim()
  if ($cu -eq $moi -and -not $Ep) { exit 0 }

  $doi = @(git diff --name-only $cu $moi 2>$null)
  $web = @($doi | Where-Object { $_ -match '^(src/|public/|data/|next\.config\.mjs$|package(-lock)?\.json$|tailwind\.config\.ts$|postcss\.config\.mjs$|tsconfig\.json$|next-env\.d\.ts$)' })
  Ghi ('commit moi {0} -> {1}, {2} file doi, {3} file web' -f $cu.Substring(0, 7), $moi.Substring(0, 7), $doi.Count, $web.Count)
  git reset --hard origin/main 2>&1 | Out-Null
  if ($web.Count -eq 0 -and -not $Ep) { Ghi 'chi doi crawler/docs/tests: khong build'; exit 0 }

  if ($doi -contains 'package-lock.json' -or -not (Test-Path "$repo\node_modules")) {
    Ghi 'npm ci'
    npm ci --no-audit --no-fund 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Ghi 'npm ci LOI'; BaoTelegram 'Deploy web 146: npm ci loi, giu ban cu.'; exit 1 }
  }

  if (Test-Path "$repo\.next") {
    if (Test-Path "$repo\.next-prev") { Remove-Item "$repo\.next-prev" -Recurse -Force }
    robocopy "$repo\.next" "$repo\.next-prev" /E /NFL /NDL /NJH /NJS /NP | Out-Null
  }
  schtasks /End /TN 'Radar Web' | Out-Null
  Start-Sleep -Seconds 3
  Ghi 'npm run build'
  $t0 = Get-Date
  $out = npm run build 2>&1
  $rc = $LASTEXITCODE
  $giay = [int]((Get-Date) - $t0).TotalSeconds
  if ($rc -ne 0) {
    Ghi ('BUILD LOI rc={0} sau {1}s; tra lai ban cu' -f $rc, $giay)
    ($out | Select-Object -Last 25) | ForEach-Object { Ghi ('  ' + $_) }
    if (Test-Path "$repo\.next-prev") {
      if (Test-Path "$repo\.next") { Remove-Item "$repo\.next" -Recurse -Force }
      Rename-Item "$repo\.next-prev" '.next'
    }
    schtasks /Run /TN 'Radar Web' | Out-Null
    BaoTelegram ('Deploy web 146 THAT BAI (build loi) tai commit ' + $moi.Substring(0, 7) + '. Da tra lai ban cu.')
    exit 1
  }
  Ghi ('build xong sau {0}s' -f $giay)
  # 28/11: GIU file JS/CSS cua cac ban build truoc. Cloudflare giu HTML cu (trang tinh s-maxage 1 nam, ISR co
  # stale-while-revalidate) ma HTML cu tro toi chunk ten cu; build moi xoa chunk cu -> 404 -> ChunkLoadError
  # "Application error" (CI 28/11 bat duoc o /tinh-lai-vay: chunks/app/page-b31f9b2a18183ae0.js tra 404).
  # Chep chunk cu con thieu sang ban moi (/XC /XN /XO: khong ghi de file trung ten), don file cu hon 30 ngay.
  if (Test-Path "$repo\.next-prev\static") {
    robocopy "$repo\.next-prev\static" "$repo\.next\static" /E /XC /XN /XO /NFL /NDL /NJH /NJS /NP | Out-Null
    $han = (Get-Date).AddDays(-30)
    Get-ChildItem "$repo\.next\static" -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $han } | Remove-Item -Force -ErrorAction SilentlyContinue
    Ghi 'giu chunk JS/CSS cu tu ban truoc (toi da 30 ngay)'
  }
  schtasks /Run /TN 'Radar Web' | Out-Null
  if (ThuTrang) {
    Ghi ('OK: web chay lai tai commit ' + $moi.Substring(0, 7))
    if (Test-Path "$repo\.next-prev") { Remove-Item "$repo\.next-prev" -Recurse -Force }
    BaoTelegram ('Deploy web 146 xong: ' + $moi.Substring(0, 7) + ' (build ' + $giay + 's).')
  } else {
    Ghi 'SERVER KHONG LEN SAU BUILD; tra lai ban cu'
    schtasks /End /TN 'Radar Web' | Out-Null
    Start-Sleep -Seconds 3
    if (Test-Path "$repo\.next-prev") {
      if (Test-Path "$repo\.next") { Remove-Item "$repo\.next" -Recurse -Force }
      Rename-Item "$repo\.next-prev" '.next'
    }
    schtasks /Run /TN 'Radar Web' | Out-Null
    BaoTelegram ('Deploy web 146: server khong len sau build ' + $moi.Substring(0, 7) + '. Da tra lai ban cu.')
    exit 1
  }
} finally {
  $mutex.ReleaseMutex() | Out-Null
}
