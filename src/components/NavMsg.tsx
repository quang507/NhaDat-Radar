"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { layClient } from "@/lib/supabase/lazy";
import { MessageSquare } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Theo dõi tin đã đọc bằng localStorage (map convId -> ISO thời điểm tin mới nhất đã xem).
const KEY = "ndr:msgseen";
type SeenMap = Record<string, string>;

function getSeen(): SeenMap {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
export function markConvSeen(convId: string, iso: string) {
  if (typeof window === "undefined") return;
  const m = getSeen();
  // so bằng Date.parse (so chuỗi ISO sẽ sai nếu lẫn định dạng "+00:00" và "Z")
  if (!m[convId] || Date.parse(m[convId]) < Date.parse(iso)) {
    m[convId] = iso;
    try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* Safari private mode / hết quota */ }
    window.dispatchEvent(new Event("ndr:msgseen"));
  }
}

// Chuông tin nhắn ở thanh nav: đếm số hội thoại có tin mới (không phải mình gửi) chưa xem.
// 2/11 (audit P1): uid lấy từ NavAuth (usePhien), supabase-js tải động - không còn nằm trong chunk layout gốc.
export default function NavMsg({ uid }: { uid: string }) {
  const [count, setCount] = useState(0);

  const recompute = useCallback(async (userId: string) => {
    const supabase = await layClient();
    const { data: convs } = await supabase.from("conversations")
      .select("id").or(`buyer_id.eq.${userId},agent_id.eq.${userId}`).limit(100);
    const ids = (convs ?? []).map((c) => c.id);
    if (!ids.length) { setCount(0); return; }
    // tin mới nhất mỗi hội thoại (RLS chỉ trả tin của hội thoại mình tham gia)
    const { data: msgs } = await supabase.from("messages")
      .select("conversation_id,sender_id,created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false }).limit(300);
    const latest = new Map<string, { sender_id: string; created_at: string }>();
    for (const m of msgs ?? []) if (!latest.has(m.conversation_id)) latest.set(m.conversation_id, m);
    const seen = getSeen();
    let n = 0;
    for (const [cid, m] of latest) {
      if (m.sender_id !== userId && (!seen[cid] || Date.parse(seen[cid]) < Date.parse(m.created_at))) n++;
    }
    setCount(n);
  }, []);

  useEffect(() => {
    let active = true;
    let sb: Awaited<ReturnType<typeof layClient>> | null = null;
    let ch: RealtimeChannel | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let onSeen: (() => void) | null = null;
    (async () => {
      sb = await layClient();
      if (!active) return;
      recompute(uid);
      // realtime (nếu publication bật) + poll dự phòng. 1/10: 20s -> 90s và CHỈ khi tab đang xem - bản cũ
      // mỗi tab mở (kể cả tab nền để quên) là 2 truy vấn / 20s = ~8.600 truy vấn/ngày/tab.
      ch = sb.channel("nav-msg")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => { if (active) recompute(uid); })
        .subscribe();
      timer = setInterval(() => { if (active && !document.hidden) recompute(uid); }, 90000);
      onSeen = () => { if (active) recompute(uid); };
      window.addEventListener("ndr:msgseen", onSeen);
    })().catch(() => { /* mất mạng khi tải chunk - bỏ qua */ });
    // Cleanup Ở CẤP useEffect (trước đây nằm trong .then nên bị vứt -> rò rỉ).
    return () => {
      active = false;
      if (sb && ch) sb.removeChannel(ch);
      if (timer) clearInterval(timer);
      if (onSeen) window.removeEventListener("ndr:msgseen", onSeen);
    };
  }, [uid, recompute]);

  return (
    // 2/11 (audit M1): vùng chạm 44px
    <Link href="/tin-nhan" className="relative btn !px-2.5 min-h-11 min-w-11 flex items-center justify-center" aria-label="Tin nhắn">
      <MessageSquare className="w-4 h-4 text-[var(--ink-soft)]" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-overline font-bold grid place-items-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
