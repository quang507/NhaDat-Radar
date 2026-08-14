"use client";

import { useActionState } from "react";
import { createListing, type ListingState } from "../actions";
import { AMEN, PROP } from "@/lib/format";
import ImageUpload from "@/components/ImageUpload";

const initial: ListingState = { ok: false };
// "furnished" bỏ khỏi đây vì đã có ô text "Nội thất" (furnishing) mô tả chi tiết hơn — tránh trùng.
const AMEN_KEYS = ["ac", "parking", "security", "elevator", "corner", "near_market", "pet"];

export default function ListingForm() {
  const [state, formAction, pending] = useActionState(createListing, initial);

  return (
    <form action={formAction} className="card rounded-2xl p-6 flex flex-col gap-4 max-w-2xl">
      <Field label="Tiêu đề *" name="title" placeholder="Bán nhà 3 tầng mặt tiền Quận 7..." />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Giao dịch" name="deal" options={[["ban", "Bán"], ["cho_thue", "Cho thuê"]]} />
        <Select
          label="Loại BĐS"
          name="kind"
          options={Object.entries(PROP).map(([k, v]) => [k, v] as [string, string])}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Tỉnh/TP" name="province" placeholder="TP.HCM" />
        <Field label="Quận/Huyện" name="district" placeholder="Quận 7" />
      </div>
      <Field label="Địa chỉ" name="address" placeholder="Số nhà, đường, phường" required={false} />
      <div className="grid grid-cols-3 gap-4">
        <Field label="Diện tích (m²)" name="area" type="number" required={false} />
        <Field label="Giá (VND) *" name="price" type="number" placeholder="8000000000" />
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
        <Field label="SĐT liên hệ" name="contact_phone" placeholder="09xxxxxxxx" required={false} />
      </div>
      {state.error ? <div className="text-red-600 text-sm">{state.error}</div> : null}
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
