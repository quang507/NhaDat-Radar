// Lớp AI dùng chung (Gemini) cho webhook Zalo: phân loại ý định + trích field / phân tích câu hỏi.
import { gemini } from "@/lib/gemini";

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
  // review /ultrareview: bản cũ tự gọi fetch với DUY NHẤT process.env.GEMINI_API_KEY — không xoay
  // khoá, không kiểm res.ok, không có nhánh 429. Khi bị chặn tần suất, phản hồi lỗi không có
  // `candidates` nên rơi vào `|| "{}"` và hàm trả về object rỗng -> bot đáp "em chưa rõ", tức là
  // HIỂU NHẦM bị-chặn-tần-suất THÀNH tin-nhắn-không-rõ-nghĩa. Người dùng bị đổ lỗi cho sự cố hạ tầng.
  //
  // Cách làm đúng đã có sẵn ngay trong repo: lib/gemini.ts xoay tối đa 5 khoá và `continue` khi gặp
  // 429. Dùng lại nó thay vì giữ bản sao thứ hai đã trôi khỏi bản gốc.
  const txt = await gemini(PROMPT + "\n\n--- TIN NHẮN ---\n" + text, { json: true, temperature: 0 });
  // Phân biệt "gọi được model nhưng không ra intent" với "KHÔNG gọi được model": gemini() trả null
  // khi đã thử hết mọi khoá mà vẫn hỏng -> nói đúng chuyện đang xảy ra, đừng đổ cho người nhắn.
  if (txt == null) {
    return { intent: "khac", reply_hint: "Dạ hệ thống đang quá tải, anh/chị nhắn lại giúp em sau ít phút ạ 🙏" };
  }
  try {
    return JSON.parse(txt) as ZaloIntent;
  } catch {
    return { intent: "khac", reply_hint: "Dạ em chưa rõ, anh/chị muốn đăng tin hay tìm nhà đất ạ?" };
  }
}
