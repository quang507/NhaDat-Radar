import Link from "next/link";
import { CircleDollarSign, Megaphone, Handshake } from "lucide-react";

export const metadata = { title: "Đăng bán bất động sản - NhaDat Radar" };

const WHY = [
  { icon: CircleDollarSign, title: "Giá trị tối đa", desc: "Thống kê giá theo khu vực và AI định giá giúp bạn đặt giá tốt nhất cho bất động sản." },
  { icon: Megaphone, title: "Tiếp cận rộng rãi", desc: "Tin của bạn hiển thị cạnh hàng trăm tin đa nguồn - nơi người mua thực sự đang tìm kiếm." },
  { icon: Handshake, title: "Hỗ trợ toàn diện", desc: "Từ đăng tin đến nhận liên hệ người mua, mọi thứ trong một trang quản lý đơn giản." },
];

const STEPS = [
  ["Tạo tin đăng", "Điền thông tin bất động sản và dán link ảnh dễ dàng - chỉ mất vài phút."],
  ["Kết nối người mua", "Nhận liên hệ từ khách hàng tiềm năng qua form liên hệ trên trang chi tiết tin."],
  ["Chốt giao dịch", "Hoàn tất giao dịch; tham khảo Hướng dẫn người bán để đúng pháp lý, tối ưu giá."],
] as const;

export default function SellLandingPage() {
  return (
    <div>
      <section className="text-center py-10 rounded-xl bg-gradient-to-br from-brand to-brand-2 text-white px-6">
        <h1 className="prata text-3xl mb-3">Đăng bán bất động sản của bạn</h1>
        <p className="opacity-90 max-w-2xl mx-auto mb-6">
          Đăng bán với NhaDat Radar để tiếp cận người mua thật. Nền tảng của chúng tôi giúp việc
          bán bất động sản trở nên đơn giản và hiệu quả - đăng tin miễn phí.
        </p>
        <Link href="/dashboard/new" className="btn !bg-white !text-brand !border-white font-bold inline-block">
          Tạo tin đăng của bạn
        </Link>
      </section>

      <section className="mt-12">
        <h2 className="prata text-2xl text-center mb-7">Vì sao nên bán với chúng tôi</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {WHY.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="card rounded-lg p-6 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-3">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold mb-1">{item.title}</h3>
                <p className="text-sm text-[var(--ink-soft)]">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="prata text-2xl text-center mb-7">Quy trình bán</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map(([t, d], i) => (
            <div key={t} className="card rounded-lg p-6">
              <div className="w-9 h-9 rounded-full bg-brand text-white grid place-items-center font-bold mb-3">{i + 1}</div>
              <h3 className="font-bold mb-1">{t}</h3>
              <p className="text-sm text-[var(--ink-soft)]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 card rounded-xl p-10 text-center">
        <h2 className="prata text-2xl mb-2">Bạn đã sẵn sàng bán bất động sản?</h2>
        <p className="text-[var(--ink-soft)] text-sm mb-5">
          Đăng nhập (Google hoặc email) rồi tạo tin - tin của bạn hiển thị ngay với nhãn “Tự đăng”.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/dashboard/new" className="btn btn-primary">Tạo tin đăng ngay</Link>
          <Link href="/huong-dan/ban" className="btn">Xem hướng dẫn bán</Link>
        </div>
      </section>
    </div>
  );
}
