"use client";

import { useActionState, useState } from "react";
import { createListing, type ListingState } from "../actions";
import { AMEN, PROP } from "@/lib/format";
import { parseVnd, fmtVndWords } from "@/lib/vnd";
import ImageUpload from "@/components/ImageUpload";

const initial: ListingState = { ok: false };
// "furnished" bỏ khỏi đây vì đã có ô text "Nội thất" (furnishing) mô tả chi tiết hơn — tránh trùng.
const AMEN_KEYS = ["ac", "parking", "security", "elevator", "corner", "near_market", "pet"];

// geo: cây Tỉnh -> [Quận] từ dữ liệu thật (server truyền xuống) để gợi ý — tin tự đăng phải khớp tên trong DB
// thì mới lọt bộ lọc/trang khu vực (UX audit 16/8: "TP.HCM" gõ tay ≠ "Hồ Chí Minh").
export default function ListingForm({ geo = {} }: { geo?: Record<string, string[]> }) {
  const [state, formAction, pending] = useActionState(createListing, initial);
  const [deal, setDeal] = useState("ban");
  const [priceRaw, setPriceRaw] = useState("");
  const [province, setProvince] = useState("");
  const [phone, setPhone] = useState("");
  const parsed = parseVnd(priceRaw);
  const provinces = Object.keys(geo).sort();
  const districts = geo[province] || [];

  return (
    <form action={formAction} className="card rounded-lg p-6 flex flex-col gap-4 max-w-2xl">
      <Field label="Tiêu đề *" name="title" placeholder="Bán nhà 3 tầng mặt tiền Quận 7..." />
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Giao dịch</span>
          <select className="inp" name="deal" value={deal} onChange={(e) => setDeal(e.target.value)}>
            <option value="ban">Bán</option><option value="cho_thue">Cho thuê</option>
          </select>
        </label>
        <Select
          label="Loại BĐS"
          name="kind"
          options={Object.entries(PROP).map(([k, v]) => [k, v] as [string, string])}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Tỉnh/TP *</span>
          <input className="inp" name="province" list="prov-list" placeholder="Hồ Chí Minh" required value={province} onChange={(e) => setProvince(e.target.value)} autoComplete="off" />
          <datalist id="prov-list">{provinces.map((p) => <option key={p} value={p} />)}</datalist>
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Quận/Huyện *</span>
          <input className="inp" name="district" list="dist-list" placeholder="Quận 7" required autoComplete="off" />
          <datalist id="dist-list">{districts.map((d) => <option key={d} value={d} />)}</datalist>
        </label>
      </div>
      <Field label="Địa chỉ" name="address" placeholder="Số nhà, đường, phường" required={false} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Field label="Diện tích (m²)" name="area" type="number" required={false} />
        <label className="block">
          <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Giá *</span>
          <input className="inp" name="price" placeholder={deal === "ban" ? "VD: 8,5 tỷ" : "VD: 12 triệu"} required value={priceRaw} onChange={(e) => setPriceRaw(e.target.value)} inputMode="decimal" />
          <span className={`block text-xs mt-1 ${parsed ? "text-emerald-600" : "text-[var(--ink-faint)]"}`}>
            {priceRaw ? (parsed ? `= ${fmtVndWords(parsed)}${deal === "cho_thue" ? "/tháng" : ""} (${parsed.toLocaleString("vi-VN")} đ)` : "Chưa đọc được — gõ kèm tỷ / triệu") : "Gõ như nói: 8,5 tỷ · 950 triệu · 12 triệu"}
          </span>
        </label>
        <Field label="Số tầng" name="floors" type="number" required={false} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Phòng ngủ" name="bedrooms" type="number" required={false} />
        <Field label="Phòng tắm" name="bathrooms" type="number" required={false} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Hướng" name="direction" placeholder="Đông Nam" required={false} />
        <Field label="Pháp lý" name="legal_status" placeholder="Sổ hồng riêng" required={false} />
      </div>
      <Field label="Nội thất" name="furnishing" placeholder="Full nội thất" required={false} />
      <div>
        <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-2">Tiện ích</span>
        <div className="flex flex-wrap gap-3">
          {AMEN_KEYS.map((k) => (
            <label key={k} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="amenities" value={k} /> {AMEN[k]}
            </label>
          ))}
        </div>
      </div>
      <div>
        <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-2">Hình ảnh</span>
        <ImageUpload name="images" />
      </div>
      <label className="block">
        <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Mô tả</span>
        <textarea className="inp" name="description" rows={4} placeholder="Mô tả chi tiết..." />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Tên liên hệ" name="contact_name" placeholder="VD: Anh Tuấn" required={false} />
        <label className="block">
          <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">SĐT liên hệ</span>
          <input className="inp" name="contact_phone" placeholder="09xxxxxxxx" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
      </div>
      {phone.trim() ? (
        <label className="flex items-start gap-2 text-xs text-[var(--ink-soft)] -mt-2">
          <input type="checkbox" name="phone_consent" className="mt-0.5" />
          <span>Tôi đồng ý hiển thị SĐT này công khai trên tin (người xem bấm "Hiện số" mới thấy). Bỏ trống SĐT nếu chỉ muốn nhận liên hệ qua form. <i>(NĐ13/2023 về dữ liệu cá nhân)</i></span>
        </label>
      ) : null}
      {state.error ? <div className="text-red-600 text-sm" role="alert">{state.error}</div> : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Đang đăng..." : "Đăng tin →"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">{label}</span>
      <input className="inp" name={name} type={type} placeholder={placeholder} required={required} />
    </label>
  );
}

function Select({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: [string, string][];
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">{label}</span>
      <select className="inp" name={name}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
