"use client";

import { LinkTheoDoi } from "./TheoDoi";
import { HOTLINE, HOTLINE_DISPLAY } from "@/lib/hotline";
import { Phone } from "lucide-react";

const SO_DEP = HOTLINE_DISPLAY;

export default function HienSoRadar({
  listingId,
  nho = false,
  className = "",
}: {
  listingId?: string;
  nho?: boolean;
  className?: string;
}) {
  return (
    <LinkTheoDoi
      loai="goi"
      listingId={listingId || ""}
      href={`tel:${HOTLINE}`}
      className={`btn btn-primary text-center whitespace-nowrap font-bold inline-flex items-center justify-center gap-2 shadow-sm ${
        nho ? "min-h-12 !px-3.5" : "w-full py-2.5 rounded-lg"
      } ${className}`}
    >
      <Phone className="w-4 h-4 shrink-0" />
      <span>{nho ? "Gọi ngay" : `Gọi Hotline: ${SO_DEP}`}</span>
    </LinkTheoDoi>
  );
}
