"use client";

import { useState } from "react";

// Thẻ 1 bài khách tìm phòng (2/10): chép bình luận / chép tin nhắn / mở bài gốc. Gửi TAY - tự động bình luận
// hàng loạt trên Facebook là bị khoá tài khoản.
export default function SanKhachCard({ binhLuan, tinNhan, url }: { binhLuan: string; tinNhan: string; url: string | null }) {
  const [da, setDa] = useState("");
  const chep = async (t: string, ten: string) => {
    try { await navigator.clipboard.writeText(t); setDa(ten); setTimeout(() => setDa(""), 2500); } catch { /* chặn clipboard */ }
  };
  const nut = "rounded px-2.5 py-1.5 text-xs font-semibold";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => chep(binhLuan, "bl")} className={`${nut} bg-blue-600 text-white hover:bg-blue-700`}>
        {da === "bl" ? "✓ Đã chép" : "💬 Chép bình luận"}
      </button>
      <button type="button" onClick={() => chep(tinNhan, "tn")} className={`${nut} bg-emerald-600 text-white hover:bg-emerald-700`}>
        {da === "tn" ? "✓ Đã chép" : "✉ Chép tin nhắn"}
      </button>
      {url && <a href={url} target="_blank" rel="noopener noreferrer" className={`${nut} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>Mở bài ↗</a>}
    </div>
  );
}
