// Lớp AI trích field (Gemini) — input tin rao lộn xộn -> JSON chuẩn + phân loại môi giới/cá nhân.
// Đọc key từ ENV (KHÔNG hardcode). Dùng: GEMINI_API_KEY=xxx node ai-extract.mjs [N]
import fs from "node:fs";

const KEY = process.env.GEMINI_API_KEY;
// flash-lite = rẻ nhất, đủ tốt cho trích field. Có thể xoay nhiều key free-tier.
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
if (!KEY) { console.error("Thiếu GEMINI_API_KEY"); process.exit(1); }

const SCHEMA_HINT = `Trả về DUY NHẤT một JSON object đúng schema (không thêm chữ nào ngoài JSON):
{
 "is_property": boolean,              // false nếu KHÔNG phải tin BĐS (vd: rao bán đèn, thiết bị...) -> để lọc rác
 "price_vnd": number|null,            // giá về VND (12 triệu->12000000, 6.75 tỷ->6750000000, null nếu thoả thuận)
 "area_m2": number|null,
 "bedrooms": number|null,
 "bathrooms": number|null,
 "floors": number|null,
 "city": string|null,                 // Hà Nội | TP.HCM | Đà Nẵng | ...
 "district": string|null,             // Quận/Huyện
 "ward": string|null,                 // Phường/Xã (nếu có)
 "street": string|null,
 "legal": string|null,                // Sổ hồng | Sổ đỏ | Sổ riêng | HĐMB | null
 "direction": string|null,            // hướng nhà
 "furnishing": string|null,           // Full nội thất | Cơ bản | Trống
 "amenities": string[],               // chọn trong: ["may_lanh","nong_lanh","full_noi_that","de_xe","thang_may","gan_cho","gan_truong","an ninh","ban_cong","gac_lung","thu_cung","wifi","bep"]
 "poster_type": "moi_gioi"|"ca_nhan"|"khong_ro",
 "poster_reason": string,             // 1 câu vì sao phân loại vậy
 "scam_suspect": boolean,             // dấu hiệu giá ảo/lừa (giá quá thấp, hối thúc cọc...)
 "title_clean": string                // tiêu đề gọn, sạch (bỏ emoji/spam), <= 90 ký tự
}`;

const SYSTEM = `Bạn là hệ thống trích xuất & phân loại tin rao bất động sản Việt Nam.
Phân loại người đăng:
- "moi_gioi" nếu: văn phong marketing (LH em/mình, hoa hồng, "quỹ căn", nhiều dòng ✨/🔥, "chuyên cho thuê", đăng nhiều căn), số máy lặp ở nhiều tin, dùng "bên em".
- "ca_nhan" (chính chủ) nếu: "chính chủ", "nhà mình", giọng cá nhân, chỉ 1 BĐS, không hoa hồng.
- "khong_ro" nếu không đủ tín hiệu.
Chỉ suy luận từ nội dung; không bịa dữ liệu không có.`;

async function extract(listing) {
  const text = `TIÊU ĐỀ: ${listing.title}\nMÔ TẢ: ${listing.description || ""}\nGIÁ HIỂN THỊ: ${listing.price_raw || ""}\nKHU VỰC GỐC: ${[listing.district, listing.province].filter(Boolean).join(", ")}`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ parts: [{ text: SCHEMA_HINT + "\n\n--- TIN ---\n" + text }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0 },
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json();
  if (!res.ok) throw new Error("Gemini " + res.status + ": " + JSON.stringify(j).slice(0, 240));
  const txt = j.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  return JSON.parse(txt);
}

// batch nhỏ để không vượt rate free-tier
async function run() {
  const N = parseInt(process.argv[2] || "6", 10);
  const db = JSON.parse(fs.readFileSync(new URL("./listings2.json", import.meta.url)));
  // chọn tin có mô tả đủ dài để test cho ý nghĩa
  const sample = db.listings.filter((x) => (x.description || "").length > 200).slice(0, N);
  const out = [];
  for (const x of sample) {
    try {
      const ai = await extract(x);
      out.push({ id: x.id, regex: { price: x.price_vnd, role: x.poster_role, beds: x.bedrooms, legal: x.legal }, ai });
      console.log("\n■", (x.title || "").slice(0, 60));
      console.log("  regex →", JSON.stringify({ price: x.price_vnd, role: x.poster_role, beds: x.bedrooms, legal: x.legal }));
      console.log("  GEMINI→", JSON.stringify({ price: ai.price_vnd, role: ai.poster_type, beds: ai.bedrooms, ward: ai.ward, legal: ai.legal, amen: ai.amenities, scam: ai.scam_suspect }));
      console.log("  vì sao role:", ai.poster_reason);
    } catch (e) { console.error("  LỖI:", e.message); }
    await new Promise((r) => setTimeout(r, 1200)); // nhẹ tay với free-tier
  }
  fs.writeFileSync(new URL("./ai-extract-out.json", import.meta.url), JSON.stringify(out, null, 2));
  console.log(`\nĐã trích ${out.length} tin -> ai-extract-out.json`);
}
run();
