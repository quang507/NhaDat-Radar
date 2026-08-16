// Helper Gemini dùng chung (server-only): xoay tối đa 5 key né 429.
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const KEYS = [
  process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY2, process.env.GEMINI_API_KEY3,
  process.env.GEMINI_API_KEY4, process.env.GEMINI_API_KEY5,
].filter(Boolean) as string[];

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
    } catch { /* thử key tiếp theo */ }
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
