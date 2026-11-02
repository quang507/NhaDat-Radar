import "server-only"; // 2/11 (audit): chặn lỡ import vào client component
// Helper Gemini dùng chung (server-only): xoay tối đa 5 key né 429.
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const KEYS = [
  process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY2, process.env.GEMINI_API_KEY3,
  process.env.GEMINI_API_KEY4, process.env.GEMINI_API_KEY5,
].filter(Boolean) as string[];
export const TIMEOUT_MS = 12_000;

export async function gemini(
  prompt: string,
  opts: { json?: boolean; temperature?: number; maxTokens?: number } = {},
): Promise<string | null> {
  const { json = true, temperature = json ? 0 : 0.4, maxTokens = 800 } = opts;
  for (const key of KEYS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // 2/11 (audit): mỗi lời gọi tối đa 12s - không thì chuỗi parse + embed + trả lời vượt maxDuration 30s
          signal: AbortSignal.timeout(TIMEOUT_MS),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              ...(json ? { responseMimeType: "application/json" } : {}),
              temperature,
              maxOutputTokens: maxTokens,
            },
          }),
        },
      );
      if (res.status === 429) continue; // hết quota key này -> xoay key sau
      const j = await res.json();
      const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (txt) return txt;
    } catch (e) {
      // hết giờ là do Gemini chậm, không phải do key -> thôi xoay, trả null để route dùng phương án dự phòng
      const ten = (e as { name?: string } | null)?.name;
      if (ten === "TimeoutError" || ten === "AbortError") return null;
      /* lỗi mạng khác: thử key tiếp theo */
    }
  }
  return null;
}

export function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export function percentile(nums: number[], p: number): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}
