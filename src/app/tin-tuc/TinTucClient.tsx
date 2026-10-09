"use client";

import { useState } from "react";
import Link from "next/link";
import SafeImg from "@/components/SafeImg";
import { type BaiViet, type ArticleCategory, CATEGORIES } from "@/lib/bai-viet";
import { tenKhuVucGon } from "@/components/AreaLanding";
import { Calendar, Clock, ArrowRight, TrendingUp, Sparkles, Newspaper, ShieldCheck } from "lucide-react";

const CAT_COLORS: Record<ArticleCategory, { bg: string; text: string; border: string }> = {
  phap_ly: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  mua_ban: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  tai_chinh: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  thue_nha: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
};

export default function TinTucClient({
  articles,
  quans,
  thang,
  nam,
}: {
  articles: BaiViet[];
  quans: { slug: string; quan: string; n: number }[];
  thang: number;
  nam: number;
}) {
  const [activeTab, setActiveTab] = useState<ArticleCategory | "all">("all");

  const filteredArticles = activeTab === "all"
    ? articles
    : articles.filter((b) => b.category === activeTab);

  const heroArticle = articles.find((b) => b.featured) || articles[0];
  const listArticles = filteredArticles.filter((b) => b.slug !== (activeTab === "all" ? heroArticle?.slug : undefined));

  return (
    <div className="space-y-10">
      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === cat.id
                ? "bg-brand text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Hero Featured Article (Chỉ hiện khi ở tab Tất cả) */}
      {activeTab === "all" && heroArticle && (
        <section className="group card rounded-3xl overflow-hidden border border-slate-200/80 bg-white hover:shadow-xl transition-all duration-300">
          <Link href={`/tin-tuc/${heroArticle.slug}`} className="grid md:grid-cols-12 gap-0">
            <div className="md:col-span-7 relative aspect-[16/10] md:aspect-auto overflow-hidden bg-slate-100">
              <SafeImg
                src={heroArticle.coverImage}
                alt={heroArticle.tieuDe}
                fallbackLabel={heroArticle.categoryName}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand text-white shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
                Tiêu điểm
              </span>
            </div>
            <div className="md:col-span-5 p-6 md:p-8 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${CAT_COLORS[heroArticle.category].bg} ${CAT_COLORS[heroArticle.category].text}`}>
                    {heroArticle.categoryName}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {heroArticle.readTime}
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 group-hover:text-brand transition-colors line-clamp-3 leading-snug">
                  {heroArticle.tieuDe}
                </h2>
                <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                  {heroArticle.moTa}
                </p>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {heroArticle.ngay}
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand group-hover:translate-x-1 transition-transform">
                  Đọc tiếp <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Main Grid of Articles */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-brand" />
            <span>{activeTab === "all" ? "Bài viết mới nhất" : CATEGORIES.find((c) => c.id === activeTab)?.name}</span>
          </h2>
          <span className="text-xs text-slate-500">{filteredArticles.length} bài viết</span>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listArticles.map((b) => {
            const catStyle = CAT_COLORS[b.category];
            return (
              <Link
                key={b.slug}
                href={`/tin-tuc/${b.slug}`}
                className="group card rounded-2xl overflow-hidden border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-lg transition-all duration-300 flex flex-col"
              >
                <div className="aspect-[16/10] relative overflow-hidden bg-slate-100">
                  <SafeImg
                    src={b.coverImage}
                    alt={b.tieuDe}
                    fallbackLabel={b.categoryName}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold shadow-sm backdrop-blur-md ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>
                    {b.categoryName}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {b.readTime}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {b.ngay}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 group-hover:text-brand transition-colors line-clamp-2 leading-snug text-base">
                      {b.tieuDe}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                      {b.moTa}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-brand">
                    <span>Xem chi tiết</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Báo cáo giá thuê theo quận */}
      <section className="pt-6 border-t border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>Báo cáo giá thuê phòng trọ TP.HCM tháng {thang}/{nam}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Thống kê trung vị từ kho dữ liệu phòng thật trên NhaDat Radar, cập nhật tự động mỗi ngày
            </p>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {quans.map((q) => (
            <Link
              key={q.slug}
              href={`/tin-tuc/gia-thue-phong-tro-${q.slug}`}
              className="card rounded-xl px-3.5 py-3 border border-slate-200/80 bg-white hover:border-brand hover:shadow-sm transition-all flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-sm font-semibold text-slate-800 truncate">
                  {tenKhuVucGon(q.quan)}
                </span>
              </div>
              <span className="text-xs font-medium text-slate-400 tabular-nums shrink-0">
                {q.n.toLocaleString("vi-VN")} phòng
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
