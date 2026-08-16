"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Upload ảnh lên Supabase Storage (bucket 'uploads', thư mục theo uid).
// Giá trị = JSON array URL, đưa vào <input hidden name={name}>.
export default function ImageUpload({
  name,
  max = 8,
  initial = [],
}: {
  name: string;
  max?: number;
  initial?: string[];
}) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, max - urls.length);
    if (!files.length) return;
    setBusy(true); setErr("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr("Cần đăng nhập để tải ảnh."); setBusy(false); return; }
    const added: string[] = [];
    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) { setErr(`Ảnh "${f.name}" quá 5MB, bỏ qua.`); continue; }
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("uploads").upload(path, f, { contentType: f.type });
      if (error) { console.error("upload:", error.message); setErr(`Không tải được ảnh "${f.name}" — thử ảnh khác hoặc tải lại trang.`); continue; }
      added.push(supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl);
    }
    setUrls((u) => [...u, ...added]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(urls)} />
      <div className="flex flex-wrap gap-2">
        {urls.map((u, i) => (
          <div key={u} className="relative w-24 h-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="w-full h-full object-cover rounded-lg border border-[var(--line)]" />
            {i === 0 && (
              <span className="absolute bottom-1 left-1 text-[0.55rem] font-bold px-1 py-0.5 rounded bg-black/60 text-white">Ảnh bìa</span>
            )}
            <button
              type="button"
              aria-label="Xoá ảnh này"
              onClick={() => setUrls((x) => x.filter((v) => v !== u))}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs grid place-items-center"
            >✕</button>
          </div>
        ))}
        {urls.length < max && (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="w-24 h-20 rounded-lg border-2 border-dashed border-[var(--line-strong)] grid place-items-center text-[var(--ink-soft)] text-xs font-semibold hover:border-brand hover:text-brand transition"
          >
            {busy ? "Đang tải…" : <>📷<br />Thêm ảnh</>}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
      <p className="text-[0.68rem] text-[var(--ink-faint)] mt-1">Tối đa {max} ảnh, mỗi ảnh ≤ 5MB. Ảnh đầu tiên là ảnh bìa.</p>
    </div>
  );
}
