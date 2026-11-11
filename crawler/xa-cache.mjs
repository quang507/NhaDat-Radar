// Xả cache web cho đúng các tin vừa đổi (3/11) - gọi POST /api/revalidate với tag "tin:<id>" (trang tin) và "ds-tin"
// (danh sách ở trang khu vực). Không xả thì phòng vừa cho thuê vẫn hiện "còn trống" tới 12 giờ (cache dữ liệu trang tin).
// Cần REVALIDATE_SECRET (cùng giá trị với biến trên Vercel) trong .env.local của máy chạy crawler; thiếu thì bỏ qua êm.
// Lỗi mạng / web lỗi không làm hỏng lượt nhập - cache vẫn tự hết hạn như cũ.
const WEB = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nhadatradar.com";
const LO = 500;

export async function xaCacheTin(ids) {
  const secret = process.env.REVALIDATE_SECRET;
  const ds = [...new Set(ids)];
  if (!ds.length) return;
  if (!secret) { console.log(`Xả cache: chưa có REVALIDATE_SECRET -> bỏ qua ${ds.length} tin (cache tự hết hạn sau tối đa 12 giờ)`); return; }
  const tags = [...ds.map((id) => `tin:${id}`), "ds-tin"];
  let xong = 0;
  for (let i = 0; i < tags.length; i += LO) {
    try {
      const res = await fetch(`${WEB}/api/revalidate`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-revalidate-secret": secret },
        body: JSON.stringify({ tags: tags.slice(i, i + LO) }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) { console.warn(`Xả cache lỗi ${res.status}: ${(await res.text()).slice(0, 120)}`); return; }
      xong += Math.min(LO, tags.length - i);
    } catch (e) {
      console.warn("Xả cache lỗi mạng:", e.message);
      return;
    }
  }
  console.log(`Xả cache ${xong - 1} trang tin + danh sách khu vực`);
}
