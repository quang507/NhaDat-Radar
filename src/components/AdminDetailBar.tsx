"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setListingStatusFromDetail, deleteListingFromDetail, getAdminListingOrigin } from "@/app/admin/actions";
import { linkGocEvohome, linkGocHifriendz } from "@/lib/ro-hang";

export default function AdminDetailBar({ id, status, isRoHang }: { id: string; status: string; isRoHang: boolean }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [goc, setGoc] = useState<{
    partner: string;
    source_post_id: string | null;
    exact_address: string | null;
    unit_code: string | null;
    commission: string | null;
    chu_nha_phone: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data: prof } = await sb.from("profiles").select("role").eq("id", user.id).single();
      if (prof?.role === "admin" && !cancelled) {
        setIsAdmin(true);
        if (isRoHang) {
          const res = await getAdminListingOrigin(id);
          if (!cancelled && res) setGoc(res);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [id, isRoHang]);

  if (!isAdmin) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs">
      <span className="font-bold text-amber-700">🛡 Admin</span>
      <span className="text-[var(--ink-soft)]">tin đang <b>{status}</b></span>
      <span className="ml-auto flex items-center gap-2">
        <form action={setListingStatusFromDetail}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={status === "hidden" ? "published" : "hidden"} />
          <button className="btn !py-1 text-xs" type="submit">{status === "hidden" ? "Hiện lại" : "Ẩn tin"}</button>
        </form>
        <form action={deleteListingFromDetail}>
          <input type="hidden" name="id" value={id} />
          <button className="btn !py-1 text-xs !text-red-600" type="submit">Xoá hẳn</button>
        </form>
      </span>
      {goc && (
        <div className="basis-full flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5 mt-0.5 border-t border-amber-400/30 text-[var(--ink)]">
          <span>🔒 Gốc <b>{goc.partner}</b>:</span>
          <span>{[goc.exact_address, goc.unit_code ? `P.${goc.unit_code}` : null, goc.commission ? `HH ${goc.commission}` : null, goc.chu_nha_phone ? `📞 SĐT chủ: ${goc.chu_nha_phone}` : null].filter(Boolean).join(" · ") || "chưa có địa chỉ thật"}</span>
          {goc.partner === "evohome" && (
            <a href={linkGocEvohome(goc.source_post_id)} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline">
              Mở trên app.evohome.it.com ↗
            </a>
          )}
          {goc.partner === "hifriendz" && (
            <a href={linkGocHifriendz(goc.source_post_id)} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline">
              Mở trên hifriendz.com ↗
            </a>
          )}
          {goc.source_post_id && <span className="font-mono text-[var(--ink-soft)]">id: {goc.source_post_id}</span>}
        </div>
      )}
    </div>
  );
}
