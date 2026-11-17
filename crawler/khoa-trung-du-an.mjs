// Khoá nhận ra CÙNG MỘT dự án mà mogi đăng nhiều lần với mã -prj khác nhau và tên viết khác nhau
// ("9 View Apartment" / "9View Apartment" / "9VIEW APARTMENT": 3 dòng trên /projects, 17/11).
// Cùng luật khoaTrungDuAn trong src/lib/du-an-hien-thi.ts (tests/unit/du-an-hien-thi.spec.ts giữ hai bản khớp).
export function khoaTrung(ten, quan) {
  const b = (x) => String(x ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `${b(ten)}|${b(quan)}`;
}
