$ErrorActionPreference = 'Stop'
# Dang ky task "Radar Tunnel": chay C:\radar-web\radar_tunnel.cmd luc khoi dong may (SYSTEM), chet thi tu chay lai
$p = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$a = New-ScheduledTaskAction -Execute 'C:\radar-web\radar_tunnel.cmd'
$t = New-ScheduledTaskTrigger -AtStartup
$s = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Radar Tunnel' -Action $a -Trigger $t -Principal $p -Settings $s -Force | Out-Null
'da dang ky: Radar Tunnel'
