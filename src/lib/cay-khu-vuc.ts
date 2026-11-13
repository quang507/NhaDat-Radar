// Kiểm tra khuôn dữ liệu và tính toàn vẹn của cây khu vực (14/11/2026 - Hướng B).
// Ném lỗi ngay nếu dữ liệu rỗng hoặc sai khuôn, ngăn việc lưu cache một cây 0 tin.

export type CayRpc = {
  c: [string, string, string, string, number][];
  w: [string, string, string][];
  s: string[];
  t: number;
};

export function kiemCayRpc(cay: unknown): CayRpc {
  if (!cay || typeof cay !== "object") {
    throw new Error("cay_khu_vuc: du lieu khong phai object");
  }
  const obj = cay as Partial<CayRpc>;
  if (!Array.isArray(obj.c) || obj.c.length === 0) {
    throw new Error("cay_khu_vuc: c phai la mang khong rong");
  }
  if (typeof obj.t !== "number" || obj.t <= 0 || Number.isNaN(obj.t)) {
    throw new Error("cay_khu_vuc: t phai la so duong");
  }
  if (!Array.isArray(obj.w) || !Array.isArray(obj.s)) {
    throw new Error("cay_khu_vuc: w va s phai la mang");
  }
  return cay as CayRpc;
}
