import type { Metadata } from "next";
import Link from "next/link";
import { DANH_SACH_DAI_HOC } from "@/lib/dai-hoc";
import { ldJson } from "@/lib/ld";
import { GraduationCap, MapPin, DollarSign, ChevronRight, Compass, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Phòng Trọ Gần Các Trường Đại Học Tại TP.HCM - Giá Rẻ, Chính Chủ | Radar Nhà Đất",
  description: "Tổng hợp danh sách phòng trọ, căn hộ mini, studio giá rẻ cho sinh viên gần các trường Đại học lớn tại TP.HCM: HUTECH, Bách Khoa, UEH, Tôn Đức Thắng, Sư Phạm Kỹ Thuật, Văn Lang... Cập nhật liên tục, có kiểm duyệt.",
  alternates: {
    canonical: "/phong-tro-gan-truong-dai-hoc",
  },
  openGraph: {
    title: "Tìm Phòng Trọ Gần Trường Đại Học TP.HCM | Radar Nhà Đất",
    description: "Kho phòng trọ sinh viên gần 15+ trường Đại học lớn tại TP.HCM. Lọc giá nhanh, xem vị trí thực tế, liên hệ trực tiếp chủ nhà.",
    url: "https://nhadatradar.com/phong-tro-gan-truong-dai-hoc",
    type: "website",
  },
};

export default function PhongTroDaiHocIndexPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Trang chủ",
        item: "https://nhadatradar.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Phòng trọ gần trường đại học",
        item: "https://nhadatradar.com/phong-tro-gan-truong-dai-hoc",
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[var(--surface-0)] text-[var(--text-1)] pb-16">
      {/* JSON-LD Breadcrumb */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(breadcrumbLd) }}
      />

      {/* Hero Header */}
      <div className="bg-gradient-to-b from-brand/10 via-[var(--surface-1)] to-[var(--surface-0)] border-b border-[var(--border)] pt-10 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb pills */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[var(--text-3)] mb-4">
            <Link href="/" className="hover:text-brand transition-colors">Trang chủ</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[var(--text-1)] font-medium">Phòng trọ gần Đại học</span>
          </nav>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/15 text-brand text-xs font-semibold mb-3">
                <GraduationCap className="w-4 h-4" />
                CỔNG TRA CỨU TRỌ SINH VIÊN TP.HCM
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--text-1)]">
                Phòng Trọ Gần Các Trường Đại Học Lớn TP.HCM
              </h1>
              <p className="mt-3 text-base text-[var(--text-2)] max-w-3xl leading-relaxed">
                Hệ thống tổng hợp và phân loại phòng trọ, căn hộ mini, ký túc xá dịch vụ quanh các giảng đường đại học lớn. Giúp sinh viên và phụ huynh tìm phòng an ninh, giá tốt, gần trường để tiết kiệm tối đa thời gian di chuyển.
              </p>
            </div>
          </div>

          {/* Quick Perks */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-[var(--border)]/60">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--text-2)]">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Tin phòng có xác minh địa chỉ</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--text-2)]">
              <DollarSign className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Giá thuê sinh viên từ 2.0 triệu</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--text-2)] col-span-2 sm:col-span-1">
              <Compass className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Lọc theo bán kính trường & trạm Metro</span>
            </div>
          </div>
        </div>
      </div>

      {/* University Directory Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--text-1)]">
            Chọn trường đại học của bạn ({DANH_SACH_DAI_HOC.length} trường)
          </h2>
          <span className="text-xs text-[var(--text-3)]">Cập nhật hàng ngày</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DANH_SACH_DAI_HOC.map((u) => (
            <Link
              key={u.id}
              href={`/phong-tro-gan-truong-dai-hoc/${u.slug}`}
              className="group bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border)] hover:border-brand/40 rounded-xl p-5 transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="inline-block px-2.5 py-0.5 text-xs font-bold rounded-md bg-brand/10 text-brand">
                    {u.tenVietTat}
                  </span>
                  <span className="text-xs text-[var(--text-3)] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-brand" />
                    {u.quan.join(", ")}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[var(--text-1)] group-hover:text-brand transition-colors line-clamp-2">
                  {u.ten}
                </h3>

                <p className="mt-2 text-xs text-[var(--text-3)] line-clamp-2 leading-relaxed">
                  {u.diaChi}
                </p>

                <div className="mt-4 pt-3 border-t border-[var(--border)]/60 flex items-center justify-between text-xs">
                  <span className="text-[var(--text-3)]">Mức giá TB:</span>
                  <span className="font-semibold text-brand">{u.mucGiaTB}</span>
                </div>

                {/* Tuyến đường hot */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {u.khuVucThueTot.slice(0, 3).map((kv, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2 py-0.5 rounded-sm bg-[var(--surface-0)] text-[var(--text-2)] border border-[var(--border)]"
                    >
                      {kv}
                    </span>
                  ))}
                  {u.khuVucThueTot.length > 3 && (
                    <span className="text-[11px] px-1.5 py-0.5 text-[var(--text-3)]">
                      +{u.khuVucThueTot.length - 3}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-medium text-brand group-hover:translate-x-0.5 transition-transform">
                <span>Xem danh sách phòng</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>

        {/* SEO Content Block */}
        <div className="mt-14 bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-bold text-[var(--text-1)] mb-4">
            Kinh nghiệm tìm phòng trọ sinh viên TP.HCM an toàn & tránh bẫy cọc
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-[var(--text-2)] leading-relaxed">
            <div>
              <h3 className="font-semibold text-[var(--text-1)] mb-1.5 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-xs flex items-center justify-center font-bold">1</span>
                Không chuyển cọc giữ chỗ khi chưa xem phòng thực tế
              </h3>
              <p>
                Tuyệt đối không chuyển tiền cọc giữ chỗ qua mạng nếu chỉ mới xem ảnh hoặc video. Hãy đến trực tiếp địa chỉ phòng trọ vào ban ngày, kiểm tra ổ khóa, ánh sáng, áp lực nước và tình trạng phòng trước khi giao dịch.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-1)] mb-1.5 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-xs flex items-center justify-center font-bold">2</span>
                Làm rõ biểu phí dịch vụ đi kèm
              </h3>
              <p>
                Ngoài giá thuê phòng hàng tháng, cần hỏi chi tiết giá điện (theo công tơ riêng hay nhà nước), giá nước (theo đầu người hay khối), phí vệ sinh, wifi, phí gửi xe và phí quản lý tòa nhà để tránh phát sinh chi phí ngoài dự kiến.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-1)] mb-1.5 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-xs flex items-center justify-center font-bold">3</span>
                Ưu tiên khoảng cách và các tuyến xe buýt đến trường
              </h3>
              <p>
                Bán kính lý tưởng để thuê trọ là từ 1 - 3km quanh trường. Nếu ngân sách hạn hẹp, bạn có thể thuê xa hơn một chút nhưng nằm gần trạm xe buýt hoặc tuyến Metro số 1 để di chuyển thuận tiện, không lo nắng mưa kẹt xe.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-1)] mb-1.5 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-xs flex items-center justify-center font-bold">4</span>
                Kiểm tra hợp đồng thuê phòng kỹ càng
              </h3>
              <p>
                Hợp đồng thuê phòng phải ghi rõ thời hạn thuê, số tiền cọc (thường là 1 tháng), điều kiện hoàn trả cọc khi hết hợp đồng và cam kết không tăng giá phòng trong suốt thời hạn ký kết.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
