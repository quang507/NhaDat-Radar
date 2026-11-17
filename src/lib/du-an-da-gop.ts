// Dự án TRÙNG đã xoá khỏi DB ngày 17/11/2026 (cùng tên + quận với một dự án khác, mogi đăng nhiều mã -prj) -> dự án giữ lại.
// Link cũ (Google đã index, người dùng lưu) được chuyển hướng vĩnh viễn thay vì 404.
// Trang /projects/[id] đọc bảng này trước khi truy vấn DB. Thêm dòng mới khi xoá thêm bản trùng.
export const DU_AN_DA_GOP: Record<string, string> = {
  "20949acf-34ec-4c59-a526-bc21bf3e6ff6": "78fb010a-3b46-4367-bb66-c87d0c873020", // Nghĩa trang Hạc Cảnh Viên
  "3260daaa-73a4-4559-bf60-71fa4b3d80da": "faf21d00-44d3-4364-8166-d0a43f666d04", // EcoGreen Sài Gòn
  "4833446b-48b3-45d8-9b10-1ebd28b4ec42": "f00eb38f-3f9b-444e-8d16-d9bc9baa568d", // Saigon Mia
  "cadcfb92-0c19-4d0a-84e0-82f0f2b38ff7": "f00eb38f-3f9b-444e-8d16-d9bc9baa568d", // Saigon Mia
  "5dc99bb7-9411-4533-a449-dc182b9b736b": "6f799a90-d445-4aec-8b2e-65a016aed96f", // Melody Residences
  "74b95220-23d0-4d12-8eee-b89549d6789e": "d964e49b-12ad-4db5-a693-c6644ef299de", // Hà Đô Centrosa Garden
  "bf5301c1-683f-4aab-abd0-a9e74d005f68": "78108e6d-505a-421c-8245-77657480fa2c", // 9 View Apartment
  "9a16a6a2-746c-4349-89b3-343b51cfabfd": "78108e6d-505a-421c-8245-77657480fa2c", // 9 View Apartment
  "e5536681-2c8a-415e-8b39-6d44254c2685": "c52dcc3c-c817-4ac5-9db0-40f662e87628", // Dragon Hill Residence and Suites 2
  "fb167447-7b50-4514-9865-879df0a205e2": "d67d4db5-e774-4013-befa-6d6f5aca4fb1", // The Pegasuite
};
