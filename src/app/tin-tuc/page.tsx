import Link from "next/link";
import { dsQuanBaoCao, thangNay, TINH_BAO_CAO } from "@/lib/bao-cao-gia";
import { BAI_VIET } from "@/lib/bai-viet";
import TinTucClient from "./TinTucClient";
import { Home, ChevronRight, BookOpen } from "lucide-react";

export const revalidate = 43200;

export async function generateMetadata() {
  const { thang, nam } = thangNay();
  return {
    title: `Tin tức & Cẩm nang Bất Động Sản tháng ${thang}/${nam} | NhaDat Radar`,
    description: `Tin tức thị trường, cẩm nang mua bán nhà đất, pháp lý sổ hồng, kinh nghiệm kiểm tra quy hoạch và báo cáo giá thuê phòng trọ TP.HCM tháng ${thang}/${nam}.`,
    alternates: { canonical: "/tin-tuc" },
  };
}

export default async function TinTucPage() {
  const { thang, nam } = thangNay();
  const quans = await dsQuanBaoCao().catch(() => []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-8">
      {/* Breadcrumb & Header */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-3" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-brand flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Trang chủ</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-slate-800 font-medium">Tin tức &amp; Cẩm nang</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200/80">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Chuyên mục Bất Động Sản</span>
            </div>
            <h1 className="prata text-2xl md:text-4xl text-slate-900 tracking-tight">
              Tin tức &amp; Cẩm nang thị trường
            </h1>
            <p className="text-sm md:text-base text-slate-600 mt-2 max-w-2xl leading-relaxed">
              Kiến thức pháp lý thực chiến, kinh nghiệm mua bán &amp; thuê nhà, báo cáo biến động giá trung vị từ kho dữ liệu thật trên NhaDat Radar.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Magazine View */}
      <TinTucClient
        articles={BAI_VIET}
        quans={quans}
        thang={thang}
        nam={nam}
      />
    </div>
  );
}
