// Bộ nhớ tạm theo tiến trình (19/11/2026, audit): bọc một hàm async tốn kém để
//  - gọi thật tối đa 1 lần trong `hanMs` trên cùng một instance (instance Vercel sống nhiều phút, nhiều request),
//  - các lượt gọi ĐỒNG THỜI dùng chung một lời hứa (không 10 request cùng chạy 10 truy vấn giống nhau),
//  - KHÔNG nhớ lượt lỗi (DB bận thì lượt sau gọi lại ngay, không giữ kết quả hỏng).
// Đứng TRƯỚC unstable_cache: lượt nào cache của Next hụt (đã đo ~390 lần/ngày gọi rpc cay_khu_vuc dù cache 6 giờ)
// vẫn không chạm DB nếu instance này vừa dựng xong cây.
export function nhoTam<T>(chay: () => Promise<T>, hanMs: number, bay: () => number = Date.now): () => Promise<T> {
  let nho: { luc: number; hua: Promise<T> } | null = null;
  return () => {
    const t = bay();
    if (nho && t - nho.luc < hanMs) return nho.hua;
    const hua = chay();
    const moi = { luc: t, hua };
    nho = moi;
    hua.catch(() => { if (nho === moi) nho = null; });
    return hua;
  };
}
