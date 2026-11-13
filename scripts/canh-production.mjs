// Chuông báo production (14/11/2026 - Hướng B).
// Kiểm tra trang chủ, 8 trang đích, cổng chặn bot cào, sitemap.
// Chạy độc lập bằng Node 22 (GitHub Actions hoặc máy cá nhân).

export const TRANG_DICH = [
  "/nha-dat-cho-thue",
  "/nha-dat-cho-thue/ho-chi-minh",
  "/nha-dat-cho-thue/ho-chi-minh/quan-go-vap",
  "/nha-dat-cho-thue/ho-chi-minh/quan-binh-thanh/phong-tro",
  "/nha-dat-ban/ho-chi-minh",
  "/phong-tro-gan/etown-cong-hoa",
  "/phong-tro-duoi-3-trieu",
  "/tin-tuc/gia-thue-phong-tro-quan-go-vap",
];

const CHROME_UA =
  "Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const META_UA =
  "meta-webindexer/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)";

export function soTinTrenTrangChu(html) {
  const m = html.match(/<title>[^<]*?-\s*([\d.]+)\s*tin\s+nhà\s+đất/i);
  if (!m) return null;
  return parseInt(m[1].replace(/\./g, ""), 10);
}

export async function kiemTra(goc) {
  const base = goc.replace(/\/+$/, "");
  const loi = [];

  // 1. GET / bằng User-Agent trình duyệt: phải 200 và soTinTrenTrangChu > 0
  let htmlTrangChu = "";
  try {
    const res = await fetch(`${base}/`, {
      headers: { "User-Agent": CHROME_UA },
      signal: AbortSignal.timeout(20000),
    });
    if (res.status !== 200) {
      loi.push(`Trang chủ / trả về mã ${res.status} (kỳ vọng 200)`);
    } else {
      htmlTrangChu = await res.text();
      const n = soTinTrenTrangChu(htmlTrangChu);
      if (n === null) {
        loi.push("Không đọc được số tin trên tiêu đề trang chủ");
      } else if (n <= 0) {
        loi.push(`Trang chủ ghi ${n} tin (kỳ vọng > 0 tin)`);
      }
    }
  } catch (e) {
    loi.push(`Lỗi khi gọi trang chủ: ${e.message}`);
  }

  // 2. Mỗi đường dẫn trong TRANG_DICH: phải 200
  for (const p of TRANG_DICH) {
    try {
      const res = await fetch(`${base}${p}`, {
        headers: { "User-Agent": CHROME_UA },
        signal: AbortSignal.timeout(20000),
      });
      if (res.status !== 200) {
        loi.push(`Trang đích ${p} trả về mã ${res.status} (kỳ vọng 200)`);
      }
    } catch (e) {
      loi.push(`Lỗi khi gọi trang đích ${p}: ${e.message}`);
    }
  }

  // 3. Lấy đường dẫn /listings/<uuid> đầu tiên trong HTML trang chủ
  const matchTin = htmlTrangChu.match(/\/listings\/([0-9a-fA-F-]{36})/);
  if (matchTin) {
    const pathTin = `/listings/${matchTin[1]}`;
    // Người dùng thật: phải 200
    try {
      const res = await fetch(`${base}${pathTin}`, {
        headers: { "User-Agent": CHROME_UA },
        signal: AbortSignal.timeout(20000),
      });
      if (res.status !== 200) {
        loi.push(`Trang tin ${pathTin} mở bằng trình duyệt trả về mã ${res.status} (kỳ vọng 200)`);
      }
    } catch (e) {
      loi.push(`Lỗi khi gọi trang tin ${pathTin} bằng trình duyệt: ${e.message}`);
    }

    // Bot cào: phải 403
    try {
      const resMeta = await fetch(`${base}${pathTin}`, {
        headers: { "User-Agent": META_UA },
        signal: AbortSignal.timeout(20000),
      });
      if (resMeta.status !== 403) {
        loi.push(`Trang tin ${pathTin} gọi bằng bot cào trả về mã ${resMeta.status} (kỳ vọng 403)`);
      }
    } catch (e) {
      loi.push(`Lỗi khi gọi trang tin ${pathTin} bằng bot cào: ${e.message}`);
    }
  } else if (htmlTrangChu) {
    loi.push("Không tìm thấy link /listings/<uuid> nào trên trang chủ để kiểm tra cổng chặn bot");
  }

  // 4. GET /sitemap.xml: phải 200 và có sitemap-khu-vuc.xml
  try {
    const res = await fetch(`${base}/sitemap.xml`, {
      headers: { "User-Agent": CHROME_UA },
      signal: AbortSignal.timeout(20000),
    });
    if (res.status !== 200) {
      loi.push(`Sitemap index /sitemap.xml trả về mã ${res.status} (kỳ vọng 200)`);
    } else {
      const text = await res.text();
      if (!text.includes("sitemap-khu-vuc.xml")) {
        loi.push("Sitemap index /sitemap.xml không chứa sitemap-khu-vuc.xml");
      }
    }
  } catch (e) {
    loi.push(`Lỗi khi gọi /sitemap.xml: ${e.message}`);
  }

  return loi;
}

// Chạy trực tiếp qua CLI
const laFileChayChinh =
  process.argv[1] && process.argv[1].endsWith("canh-production.mjs");

if (laFileChayChinh) {
  (async () => {
    const goc = process.env.BASE_URL || "https://www.nhadatradar.com";
    console.log(`Đang kiểm tra production tại ${goc}...`);
    const dsLoi = await kiemTra(goc);
    if (dsLoi.length === 0) {
      console.log("✓ Production hoạt động bình thường, không có lỗi.");
      process.exit(0);
    } else {
      console.error(`✗ Phát hiện ${dsLoi.length} lỗi trên production:`);
      for (const l of dsLoi) console.error(`  - ${l}`);
      process.exit(1);
    }
  })();
}
