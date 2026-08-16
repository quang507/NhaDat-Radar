// Lý do báo tin xấu — dùng chung cho form (client), server action và trang admin.
export const REPORT_REASONS: Record<string, string> = {
  da_ban: "Tin đã bán / đã cho thuê",
  sai_gia: "Giá không đúng thực tế",
  sai_dia_chi: "Sai địa chỉ / ảnh không đúng",
  gia_chinh_chu: "Môi giới giả chính chủ",
  lua_dao: "Có dấu hiệu lừa đảo",
  trung_lap: "Tin trùng lặp / spam",
  khac: "Khác",
};
