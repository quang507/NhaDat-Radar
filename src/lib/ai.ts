// Lớp AI dùng chung (Gemini) cho webhook Zalo: phân loại ý định + trích field / phân tích câu hỏi.
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

export type ZaloIntent = {
  intent: "dang_tin" | "hoi_tin" | "khac";
  reply_hint?: string;
  listing?: {
    title?: string; price_vnd?: number | null; area_m2?: number | null;
    bedrooms?: number | null; listing_type?: "ban" | "cho_thue";
    property_type?: string; province?: string | null; district?: string | null;
    ward?: string | null; legal?: string | null; amenities?: string[]; contact_phone?: string | null;
  };
  query?: {
    listing_type?: "ban" | "cho_thue"; property_type?: string;
    province?: string | null; district?: string | null; ward?: string | null;
    price_min?: number | null; price_max?: number | null; area_min?: number | null;
  };
};

const PROMPT = `Bạn là trợ lý Zalo OA của một sàn nhà đất. Đọc tin nhắn người dùng gửi cho OA và trả về DUY NHẤT 1 JSON:
{
 "intent": "dang_tin" | "hoi_tin" | "khac",   // dang_tin: họ RAO/cung cấp 1 BĐS; hoi_tin: họ HỎI/tìm BĐS; khac: chào hỏi/khác
 "reply_hint": string,                         // 1 câu gợi ý trả lời thân thiện
 "listing": {                                  // CHỈ khi intent=dang_tin, trích từ tin nhắn
   "title": string, "price_vnd": number|null, "area_m2": number|null, "bedrooms": number|null,
   "listing_type": "ban"|"cho_thue", "property_type": "nha"|"dat"|"can_ho"|"mat_bang"|"phong_tro"|"khac",
   "province": string|null, "district": string|null, "ward": string|null, "legal": string|null,
   "amenities": string[], "contact_phone": string|null
 },
 "query": {                                    // CHỈ khi intent=hoi_tin, phân tích tiêu chí tìm
   "listing_type": "ban"|"cho_thue"|null, "property_type": string|null,
   "province": string|null, "district": string|null, "ward": string|null,
   "price_min": number|null, "price_max": number|null, "area_min": number|null
 }
}
Giá quy về VND (3tr5 -> 3500000, 6 tỷ -> 6000000000). Chỉ suy từ nội dung, không bịa.`;

export async function classifyAndExtract(text: string): Promise<ZaloIntent> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { intent: "khac", reply_hint: "Xin chào! Anh/chị cần đăng tin hay tìm nhà đất ạ?" };
  const body = {
    contents: [{ parts: [{ text: PROMPT + "\n\n--- TIN NHẮN ---\n" + text }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0 },
  };
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
    const j = await res.json();
    const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    return JSON.parse(txt) as ZaloIntent;
  } catch {
    return { intent: "khac", reply_hint: "Dạ em chưa rõ, anh/chị muốn đăng tin hay tìm nhà đất ạ?" };
  }
}
