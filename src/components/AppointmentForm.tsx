"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { baoGA } from "@/lib/su-kien-client";
import { CheckCircle2, Calendar } from "lucide-react";

// Đặt lịch xem nhà (chỉ tin người bán tự đăng - cần agent_id).
export default function AppointmentForm({ listingId, agentId }: { listingId: string; agentId: string }) {
  const [slot, setSlot] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slot || state !== "idle") return;
    setState("busy"); setErr("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth?message=" + encodeURIComponent("Đăng nhập để đặt lịch xem nhà.")); return; }
    if (user.id === agentId) { setErr("Đây là tin của bạn."); setState("idle"); return; }
    const { error } = await supabase.from("appointments").insert({
      listing_id: listingId, buyer_id: user.id, agent_id: agentId,
      slot: new Date(slot).toISOString(), note: note.slice(0, 500) || null,
    });
    if (error) { console.error("appointment:", error.message); setErr("Chưa đặt được lịch - thử lại hoặc liên hệ trực tiếp người đăng."); setState("idle"); }
    else { setState("done"); baoGA("ndr_dat_lich", { listing_id: listingId, kieu: "tin_tu_dang" }); }
  }

  if (state === "done") {
    return (
      <p className="text-sm text-emerald-600 font-semibold flex items-center gap-1.5">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>Đã gửi yêu cầu xem nhà - người bán sẽ xác nhận, theo dõi tại Kênh người bán.</span>
      </p>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <span className="lbl flex items-center gap-1.5">
        <Calendar className="w-4 h-4 text-brand shrink-0" />
        <span>Đặt lịch xem nhà</span>
      </span>
      <input className="inp" type="datetime-local" value={slot} onChange={(e) => setSlot(e.target.value)} required />
      <input className="inp" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (tuỳ chọn)" />
      <button className="btn w-full" type="submit" disabled={state !== "idle"}>
        {state === "busy" ? "Đang gửi…" : "Gửi yêu cầu xem nhà"}
      </button>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </form>
  );
}
