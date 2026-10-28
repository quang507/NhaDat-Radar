#!/usr/bin/env bash
# Tóm tắt mức bận theo giờ từ tai-<ngày>.csv (mặc định hôm nay). CPU tính trên 200% = 2 nhân.
f="$HOME/radar/logs/tai-${1:-$(date +%F)}.csv"
[ -f "$f" ] || { echo "Không có $f"; exit 1; }
echo "giờ | CPU máy TB/max | gatemonitor TB | openwa TB | radar TB/max | RAM trống min (MB) | swap max | RAM radar max"
awk -F, '{h=substr($1,12,2); n[h]++; c[h]+=$3; if($3>cm[h])cm[h]=$3; g[h]+=$4; o[h]+=$5; r[h]+=$6; if($6>rm[h])rm[h]=$6;
  if(!(h in am)||$7<am[h])am[h]=$7; if($8>sw[h])sw[h]=$8; if($10>rr[h])rr[h]=$10}
  END{for(h in n) printf "%s  | %3.0f%% / %3d%% | %3.0f%% | %3.0f%% | %3.0f%% / %3d%% | %5d | %4d | %4d\n", h, c[h]/n[h], cm[h], g[h]/n[h], o[h]/n[h], r[h]/n[h], rm[h], am[h], sw[h], rr[h]}' "$f" | sort
