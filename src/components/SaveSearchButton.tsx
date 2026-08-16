"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Filters = {
  deal?: string; kind?: string; province?: string; district?: string; ward?: string;
  priceMin?: string; priceMax?: string; areaMin?: string;
};

// 🔔 Lưu bộ lọc hiện tại -> bảng saved_searches; cron hằng ngày gửi email khi có tin mới khớp.
export default function SaveSearchButton({ filters }: { filters: Filters }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const router = useRouter();

  async function save() {
    if (state !== "idle") return;
    setState("busy");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth?message=" + encodeURIComponent("Đăng nhập để nhận email khi có tin mới khớp bộ lọc của bạn."));
      return;
    }
    const { error } = await supabase.from("saved_searches").insert({
      user_id: user.id,
      email: user.email,
      deal: filters.deal === "ban" || filters.deal === "cho_thue" ? filters.deal : null,
      kind: filters.kind || null,
      province: filters.province || null,
      district: filters.district || null,
      ward: filters.ward || null,
      price_min: Number(filters.priceMin) || null,
      price_max: Number(filters.priceMax) || null,
      area_min: Number(filters.areaMin) || null,
    });
    setState(error ? "idle" : "done");
    if (error) { console.error("saveSearch:", error.message); alert("Chưa lưu được bộ lọc — thử lại sau ít phút."); }
  }

  return (
    <button className="btn text-sm" onClick={save} disabled={state !== "idle"} type="button">
      {state === "done" ? "✅ Sẽ email khi có tin mới" : state === "busy" ? "Đang lưu…" : "🔔 Nhận email tin mới"}
    </button>
  );
}
