$ErrorActionPreference = 'Stop'
$p = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest

# 1) Server web: bat luc khoi dong may, chet thi Task Scheduler + vong lap trong .cmd tu chay lai
$a1 = New-ScheduledTaskAction -Execute 'C:\radar-web\radar_web.cmd'
$t1 = New-ScheduledTaskTrigger -AtStartup
$s1 = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Radar Web' -Action $a1 -Trigger $t1 -Principal $p -Settings $s1 -Force | Out-Null
'da dang ky: Radar Web'

# 2) Tu dong deploy: 5 phut/lan (DANG KY o trang thai TAT, bat sau khi web chay on)
$a2 = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -ExecutionPolicy Bypass -File C:\radar-web\deploy_web.ps1'
$t2 = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)
$s2 = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 1) -StartWhenAvailable -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Radar Web deploy' -Action $a2 -Trigger $t2 -Principal $p -Settings $s2 -Force | Out-Null
Disable-ScheduledTask -TaskName 'Radar Web deploy' | Out-Null
'da dang ky (dang TAT): Radar Web deploy'
Get-ScheduledTask -TaskName 'Radar Web*' | ForEach-Object { '{0} {1}' -f $_.TaskName, $_.State }
