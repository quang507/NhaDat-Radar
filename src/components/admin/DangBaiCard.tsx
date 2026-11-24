"use client";
// Thẻ "1-Click lấy content đăng bài" (28/9): sao chép bài FB/Threads + tải trọn bộ ảnh gốc của phòng.
// Ảnh đi qua /api/admin/anh (chỉ admin, chỉ domain đối tác rổ hàng) để trình duyệt tải về như file
// - thẻ <a download> trỏ thẳng ảnh khác domain thì trình duyệt chỉ mở ảnh, không tải.
import { useState } from "react";

export default function DangBaiCard({ tieuDe, noiDung, anh, phu }: { tieuDe: string; noiDung: string; anh: string[]; phu?: string }) {
  const [daChep, setDaChep] = useState(false);
  const [dangTai, setDangTai] = useState(false);

  async function chep() {
    try { await navigator.clipboard.writeText(noiDung); } catch {
      const t = document.createElement("textarea"); t.value = noiDung; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
    setDaChep(true); setTimeout(() => setDaChep(false), 2000);
  }

  async function taiAnh() {
    setDangTai(true);
    for (let i = 0; i < anh.length; i++) {
      const a = document.createElement("a");
      a.href = `/api/admin/anh?u=${encodeURIComponent(anh[i])}&n=${i + 1}`;
      a.download = "";
      document.body.appendChild(a); a.click(); a.remove();
      await new Promise((r) => setTimeout(r, 400));   // dồn dập quá trình duyệt chặn "tải nhiều file"
    }
    setDangTai(false);
  }

  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 shadow-xs flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm text-[var(--ink)] truncate">{tieuDe}</div>
          {phu && <div className="text-[11px] text-[var(--ink-soft)] truncate" title={phu}>🔒 {phu}</div>}
        </div>
      </div>
      {anh.length > 0 && (
        <div className="flex gap-1 overflow-x-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {anh.slice(0, 6).map((u) => <img key={u} src={u} alt="" className="h-16 w-20 shrink-0 rounded-xs object-cover" loading="lazy" />)}
        </div>
      )}
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--surface-2)] p-2 text-[11px] leading-relaxed text-[var(--ink-soft)] border border-[var(--line)]">{noiDung}</pre>
      <div className="flex gap-2">
        <button onClick={chep} className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 min-h-11">
          {daChep ? "✓ Đã chép" : "📋 Sao chép bài đăng"}
        </button>
        {anh.length > 0 && (
          <button onClick={taiAnh} disabled={dangTai} className="flex-1 rounded-md border border-[var(--line-strong)] px-3 py-2 text-xs font-bold text-[var(--ink)] hover:bg-[var(--surface-2)] disabled:opacity-60 min-h-11">
            {dangTai ? "Đang tải…" : `⬇ Tải ${anh.length} ảnh`}
          </button>
        )}
      </div>
    </div>
  );
}
