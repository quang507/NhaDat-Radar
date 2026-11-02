// Bỏ tin trùng khi hiển thị (3/11, UX audit): môi giới đăng cùng một căn vào nhiều nhóm Zalo / nhiều lần trong ngày,
// crawler ghi thành nhiều dòng -> trang chủ hiện "CHDV Thảo Điền 42,8 tỷ" 3 lần liền, trông như trang cào rác.
// Khoá = tiêu đề chuẩn hoá + giá + diện tích. Giữ tin đứng TRƯỚC (danh sách đã xếp theo ưu tiên/mới nhất).
// Chỉ lọc lúc hiển thị; gộp ở bước nhập là việc của crawler.
export function khoaTin(x: { title?: string | null; price_vnd?: number | null; area_m2?: number | null }) {
  const ten = String(x.title || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 60);
  return `${ten}|${x.price_vnd ?? ""}|${x.area_m2 ?? ""}`;
}

export function boTinTrung<T extends { title?: string | null; price_vnd?: number | null; area_m2?: number | null }>(ds: T[]): T[] {
  const daThay = new Set<string>();
  return ds.filter((x) => {
    const k = khoaTin(x);
    if (daThay.has(k)) return false;
    daThay.add(k);
    return true;
  });
}
