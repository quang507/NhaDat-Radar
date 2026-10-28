#!/usr/bin/env bash
# Ghi mức bận CPU/RAM của NUC mỗi phút (radar-do-tai.timer) -> ~/radar/logs/tai-<ngày>.csv
# Cột: giờ, load1, cpu_may% (cả 2 nhân = 200%), cpu_gate%, cpu_openwa%, cpu_radar%, ram_trong_MB, swap_MB, ram_gate_MB, ram_radar_MB
# Xem tóm tắt theo giờ: ~/radar/tom-tat-tai.sh [ngày]
set -u
CG=/sys/fs/cgroup
ST="$HOME/radar/logs/.tai-truoc"
usec() { awk '/^usage_usec/{print $2}' "$1/cpu.stat" 2>/dev/null || echo 0; }
mem() { [ -f "$1/memory.current" ] && echo $(( $(cat "$1/memory.current") / 1048576 )) || echo 0; }
now=$(date +%s%N); read -r _ u n s i w q sq st _ < /proc/stat
may=$((u+n+s+q+sq+st)); tong=$((may+i+w))
g=$(usec $CG/system.slice/gatemonitor.service); o=$(usec $CG/system.slice/openwa.service); r=$(usec $CG/radar.slice)
if [ -f "$ST" ]; then
  read -r now0 may0 tong0 g0 o0 r0 < "$ST"
  dt=$(( (now-now0)/1000 ))   # micro giây
  pc() { awk -v a="$1" -v b="$2" -v d="$dt" 'BEGIN{ if (d>0) printf "%.0f", (a-b)*100/d; else print 0 }'; }
  cpu=$(awk -v a=$((may-may0)) -v b=$((tong-tong0)) 'BEGIN{ if (b>0) printf "%.0f", a*200/b; else print 0 }')
  am=$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)
  sw=$(awk '/SwapTotal/{t=$2}/SwapFree/{f=$2}END{print int((t-f)/1024)}' /proc/meminfo)
  echo "$(date '+%F %H:%M'),$(cut -d' ' -f1 /proc/loadavg),$cpu,$(pc $g $g0),$(pc $o $o0),$(pc $r $r0),$am,$sw,$(mem $CG/system.slice/gatemonitor.service),$(mem $CG/radar.slice)" >> "$HOME/radar/logs/tai-$(date +%F).csv"
fi
echo "$now $may $tong $g $o $r" > "$ST"
find "$HOME/radar/logs" -name 'tai-*.csv' -mtime +30 -delete
