"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
  if (!m[convId] || m[convId] < iso) {
    m[convId] = iso;
    localStorage.setItem(KEY, JSON.stringify(m));
    window.dispatchEvent(new Event("ndr:msgseen"));
  }
}

// Chuông tin nhắn ở thanh nav: đếm số hội thoại có tin mới (không phải mình gửi) chưa xem.
export default function NavMsg() {
  const [uid, setUid] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const supabase = createClient();

  const recompute = useCallback(async (userId: string) => {
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
      if (m.sender_id !== userId && (!seen[cid] || seen[cid] < m.created_at)) n++;
    }
    setCount(n);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    let ch: ReturnType<typeof supabase.channel> | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let onSeen: (() => void) | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;
      setUid(user.id);
      recompute(user.id);
      // realtime (nếu publication bật) + poll dự phòng 20s
      ch = supabase.channel("nav-msg")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => { if (active) recompute(user.id); })
        .subscribe();
      timer = setInterval(() => { if (active) recompute(user.id); }, 20000);
      onSeen = () => { if (active) recompute(user.id); };
      window.addEventListener("ndr:msgseen", onSeen);
    })();
    // Cleanup Ở CẤP useEffect (trước đây nằm trong .then nên bị vứt -> rò rỉ).
    return () => {
      active = false;
      if (ch) supabase.removeChannel(ch);
      if (timer) clearInterval(timer);
      if (onSeen) window.removeEventListener("ndr:msgseen", onSeen);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!uid) return null;
  return (
    <Link href="/tin-nhan" className="relative btn !px-3" aria-label="Tin nhắn">
      💬
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[0.65rem] font-bold grid place-items-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
