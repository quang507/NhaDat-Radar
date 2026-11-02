// Thông tin ĐƠN VỊ CHỦ QUẢN công bố ở footer, trang Liên hệ, Chính sách bảo mật (audit pháp lý 2/11:
// Luật TMĐT 122/2025 Điều 11, 15 bắt buộc công bố chủ sở hữu, địa chỉ, MST; Luật 91/2025 cần nêu bên
// kiểm soát dữ liệu). Ô nào còn rỗng thì giao diện ẩn dòng đó - KHÔNG điền số ước đoán.
// Đăng ký xong với Bộ Công Thương (online.gov.vn) thì dán link xác nhận vào boCongThuong.
export const DON_VI = {
  ten: "",          // VD: "Công ty TNHH ..." hoặc "Hộ kinh doanh ..."
  maSoThue: "",     // MST / số GCN ĐKDN
  ngayCap: "",      // VD: "01/01/2026"
  noiCap: "",       // VD: "Sở Tài chính TP.HCM"
  diaChi: "",       // địa chỉ trụ sở
  email: "contact@nhadatradar.com",
  hotline: "0387 365 020",
  boCongThuong: "", // link xác nhận thông báo/đăng ký trên online.gov.vn
} as const;
