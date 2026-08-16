"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { markConvSeen } from "@/components/NavMsg";

type Conv = { id: string; listing_id: string | null; buyer_id: string; agent_id: string; created_at: string; title?: string; other?: string };
type Msg = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };

function Chat() {
  const sp = useSearchParams();
  const [uid, setUid] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Nạp hội thoại (+ tự tạo nếu đến từ nút "Nhắn tin" trên tin đăng)
  const loadConvs = useCallback(async (userId: string) => {
    const listing = sp.get("listing"), agent = sp.get("agent");
    if (listing && agent && agent !== userId) {
      await supabase.from("conversations")
        .insert({ listing_id: listing, buyer_id: userId, agent_id: agent })
        .select().maybeSingle(); // trùng unique -> lỗi, bỏ qua
    }
    const { data } = await supabase.from("conversations")
      .select("*").or(`buyer_id.eq.${userId},agent_id.eq.${userId}`)
      .order("created_at", { ascending: false }).limit(50);
    const list = (data ?? []) as Conv[];
    // gắn tiêu đề tin + tên đối phương
    const lids = [...new Set(list.map((c) => c.listing_id).filter(Boolean))] as string[];
    const pids = [...new Set(list.flatMap((c) => [c.buyer_id, c.agent_id]))].filter((p) => p !== userId);
    const [{ data: ls }, { data: ps }] = await Promise.all([
      lids.length ? supabase.from("listings").select("id,title").in("id", lids) : Promise.resolve({ data: [] }),
      pids.length ? supabase.from("profiles").select("id,full_name").in("id", pids) : Promise.resolve({ data: [] }),
    ]);
    const lmap = new Map((ls ?? []).map((l) => [l.id, l.title]));
    const pmap = new Map((ps ?? []).map((p) => [p.id, p.full_name]));
    for (const c of list) {
      c.title = (c.listing_id && lmap.get(c.listing_id)) || "Trao đổi chung";
      c.other = pmap.get(c.buyer_id === userId ? c.agent_id : c.buyer_id) || "Người dùng";
    }
    setConvs(list);
    if (listing) {
      const match = list.find((c) => c.listing_id === listing);
      if (match) setSel(match.id);
    } else if (list.length && !sel) setSel(list[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUid(user?.id ?? null);
      if (user) loadConvs(user.id).finally(() => setLoaded(true));
      else setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nạp tin nhắn của hội thoại đang chọn: realtime (nếu bật) + poll dự phòng 15s.
  useEffect(() => {
    if (!sel) return;
    let stop = false;
    const load = async () => {
      const { data } = await supabase.from("messages")
        .select("*").eq("conversation_id", sel).order("created_at", { ascending: true }).limit(200);
      if (stop) return;
      const rows = (data ?? []) as Msg[];
      setMsgs(rows);
      const last = rows[rows.length - 1];
      if (last) markConvSeen(sel, last.created_at); // đang mở hội thoại -> coi như đã đọc
    };
    load();
    const ch = supabase.channel(`msgs-${sel}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${sel}` },
        (payload) => {
          if (stop) return;
          const m = payload.new as Msg;
          setMsgs((prev) => {
            if (prev.some((p) => p.id === m.id)) return prev; // đã có (poll load được trước)
            // Gỡ ĐÚNG 1 tin optimistic khớp (cùng người gửi + nội dung), giữ các tmp khác đang chờ.
            const idx = prev.findIndex((p) => p.id.startsWith("tmp") && p.sender_id === m.sender_id && p.body === m.body);
            const base = idx >= 0 ? prev.filter((_, i) => i !== idx) : prev;
            return [...base, m];
          });
          markConvSeen(sel, m.created_at);
        })
      .subscribe();
    const t = setInterval(load, 15000);
    return () => { stop = true; supabase.removeChannel(ch); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  useEffect(() => { bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight }); }, [msgs]);

  async function send() {
    const body = input.trim();
    if (!body || !sel || !uid) return;
    setInput("");
    const tmpId = "tmp" + Date.now() + Math.random().toString(36).slice(2, 7); // tránh trùng key khi gửi nhanh
    const optimistic: Msg = { id: tmpId, conversation_id: sel, sender_id: uid, body, created_at: new Date().toISOString() };
    setMsgs((m) => [...m, optimistic]);
    const { error } = await supabase.from("messages").insert({ conversation_id: sel, sender_id: uid, body });
    if (error) {
      setMsgs((m) => m.filter((x) => x.id !== tmpId)); // gửi lỗi -> gỡ tin optimistic, khỏi "mất im lặng"
      setInput(body); // trả nội dung để người dùng gửi lại
    }
  }

  if (!loaded) return <p className="text-center py-16 text-[var(--ink-soft)]">Đang tải…</p>;
  if (!uid) return (
    <div className="card rounded-lg p-10 text-center max-w-md mx-auto mt-8">
      <div className="text-4xl mb-3">💬</div>
      <p className="text-sm text-[var(--ink-soft)] mb-4">Đăng nhập để nhắn tin với người bán.</p>
      <Link href="/auth" className="btn btn-primary inline-block">Đăng nhập</Link>
    </div>
  );

  const cur = convs.find((c) => c.id === sel);
  return (
    <div>
      <h1 className="prata text-2xl mb-4">Tin nhắn</h1>
      <div className="grid md:grid-cols-[280px_1fr] gap-4 items-start">
        <div className="card rounded-lg overflow-hidden">
          {convs.length ? convs.map((c) => (
            <button
              key={c.id}
              onClick={() => setSel(c.id)}
              className={`w-full text-left px-4 py-3 border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-2)] ${sel === c.id ? "bg-brand/10" : ""}`}
            >
              <div className="font-semibold text-sm truncate">{c.other}</div>
              <div className="text-xs text-[var(--ink-soft)] truncate">{c.title}</div>
            </button>
          )) : (
            <p className="p-5 text-sm text-[var(--ink-soft)]">Chưa có hội thoại nào. Bấm “💬 Nhắn tin” trên tin đăng của người bán để bắt đầu.</p>
          )}
        </div>

        <div className="card rounded-lg flex flex-col h-[60vh]">
          {cur ? (
            <>
              <div className="px-4 py-3 border-b border-[var(--line)]">
                <div className="font-bold text-sm">{cur.other}</div>
                {cur.listing_id && (
                  <Link href={`/listings/${cur.listing_id}`} className="text-xs text-brand truncate block">{cur.title} →</Link>
                )}
              </div>
              <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {msgs.map((m) => (
                  <div key={m.id} className={`max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.sender_id === uid ? "ml-auto bg-brand text-white rounded-br-sm" : "bg-[var(--surface-2)] rounded-bl-sm"
                  }`}>{m.body}</div>
                ))}
                {!msgs.length && <p className="text-xs text-[var(--ink-faint)] text-center py-6">Gửi tin nhắn đầu tiên 👋</p>}
              </div>
              <form className="p-2 border-t border-[var(--line)] flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
                <input className="inp !py-2 text-sm" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Nhập tin nhắn…" />
                <button className="btn btn-primary !px-4" type="submit" aria-label="Gửi tin nhắn">➤</button>
              </form>
            </>
          ) : (
            <p className="m-auto text-sm text-[var(--ink-soft)]">Chọn một hội thoại bên trái.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return <Suspense fallback={<p className="text-center py-16 text-[var(--ink-soft)]">Đang tải…</p>}><Chat /></Suspense>;
}
