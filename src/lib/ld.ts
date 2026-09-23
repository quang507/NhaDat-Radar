/**
 * Tuần tự hoá JSON-LD an toàn để nhúng vào <script> (tách từ AreaLanding 23/9 để trang tin dùng chung).
 *
 * XSS LƯU TRỮ (review /ultrareview): JSON.stringify KHÔNG escape "<" hay "/", nên một tiêu đề tin
 * CÀO chứa "</script>" thoát ra khỏi thẻ script và chạy mã trên chính origin của site. Kiểm chứng:
 *   title = 'Bán nhà Q7 </script><img src=x onerror=alert(document.domain)>'
 *   JSON.stringify(o).includes("</script>") === true
 * Escape sang \\u00XX: vẫn là JSON hợp lệ, trình duyệt vẫn parse đúng, mà không thoát được thẻ.
 */
export function ldJson(o: unknown): string {
  return JSON.stringify(o)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nhadatradar.com";
