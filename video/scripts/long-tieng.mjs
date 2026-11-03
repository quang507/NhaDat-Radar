// Lồng tiếng bằng ElevenLabs: mỗi câu -> public/vo/<bo>/<id>.mp3 + độ dài vào public/vo/<bo>/vo.json.
// Câu không đổi (cùng giọng, model, chữ) thì dùng lại file cũ, không tốn ký tự.
//
//   node scripts/long-tieng.mjs promo     -> kịch bản RadarPromo
//   node scripts/long-tieng.mjs ba-buoc   -> kịch bản BaBuoc
//   import { longTieng } ... từ lay-tin.mjs cho video tin thật
//
// Key/giọng đọc ở video/.env (ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL) - không commit.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

function docEnv() {
  const env = { ...process.env };
  const f = path.join(ROOT, ".env");
  if (existsSync(f)) {
    for (const dong of readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = dong.match(/^(ELEVENLABS_[A-Z_]+)=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim();
    }
  }
  if (!env.ELEVENLABS_API_KEY) throw new Error("Thiếu ELEVENLABS_API_KEY trong video/.env");
  return { key: env.ELEVENLABS_API_KEY, giong: env.ELEVENLABS_VOICE_ID || "XrExE9yKIg1WjnnlVkGX", model: env.ELEVENLABS_MODEL || "eleven_v3" };
}

// Kịch bản cố định. Số viết bằng chữ: model đọc "50" hay "3.500đ" lúc đúng lúc sai.
export const KICH_BAN = {
  promo: [
    ["hook", "[warmly] Tìm phòng trọ mà không cần lướt năm mươi nhóm Zalo?"],
    ["costs", "Trên Nhà Đất Radar, giá ghi rõ từng khoản. Tiền phòng, điện, nước, gửi xe, phí dịch vụ. Không phát sinh."],
    ["map", "Mở bản đồ là thấy phòng quanh bạn. Lọc theo quận, giá và diện tích."],
    ["cta", "Ưng phòng nào, nhắn Zalo kèm mã phòng là xong."],
  ],
  "ba-buoc": [
    ["mo", "[warmly] Thuê phòng qua Nhà Đất Radar chỉ cần ba bước."],
    ["b1", "Một. Tìm phòng trên bản đồ, chi phí ghi rõ từng khoản."],
    ["b2", "Hai. Bấm nút Zalo, mã phòng được chép sẵn cho bạn."],
    ["b3", "Ba. Dán vào khung chat và gửi. Radar hẹn bạn đi xem phòng."],
    ["cta", "Vào nhà đất radar chấm com, tìm phòng ngay hôm nay."],
  ],
};

async function taoMot(env, chu) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${env.giong}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": env.key, "Content-Type": "application/json" },
    body: JSON.stringify({ text: chu, model_id: env.model, language_code: "vi" }),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  const het = j.alignment?.character_end_times_seconds ?? [];
  return { mp3: Buffer.from(j.audio_base64, "base64"), giay: het.length ? het[het.length - 1] : 0 };
}

/** cau: [[id, chữ], ...] -> { id: { src, giay } } (src tương đối public/, dùng với staticFile) */
export async function longTieng(bo, cau) {
  const env = docEnv();
  const thuMuc = path.join(ROOT, "public", "vo", bo);
  mkdirSync(thuMuc, { recursive: true });
  const fileVo = path.join(thuMuc, "vo.json");
  const cu = existsSync(fileVo) ? JSON.parse(readFileSync(fileVo, "utf8")) : {};
  const vo = {};
  let kyTu = 0;
  for (const [id, chu] of cau) {
    const bam = createHash("sha1").update(`${env.giong}|${env.model}|${chu}`).digest("hex").slice(0, 12);
    const src = `vo/${bo}/${id}-${bam}.mp3`;
    if (cu[id]?.src === src && existsSync(path.join(ROOT, "public", src))) { vo[id] = cu[id]; continue; }
    const { mp3, giay } = await taoMot(env, chu);
    writeFileSync(path.join(ROOT, "public", src), mp3);
    vo[id] = { src, giay: Math.round(giay * 100) / 100, chu };
    kyTu += chu.length;
    console.log(`  ${id}: ${vo[id].giay}s  ${chu}`);
  }
  writeFileSync(fileVo, JSON.stringify(vo, null, 2));
  console.log(`Lồng tiếng ${bo}: ${cau.length} câu, tốn ${kyTu} ký tự`);
  return vo;
}

// ---- đọc số tiếng Việt cho kịch bản sinh từ dữ liệu tin ----
const SO = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function baChuSo(n, day) {
  const tram = Math.floor(n / 100), chuc = Math.floor((n % 100) / 10), dv = n % 10;
  const t = [];
  if (day || tram) t.push(SO[tram], "trăm");
  if (chuc === 0) { if (dv && (day || tram)) t.push("lẻ"); }
  else if (chuc === 1) t.push("mười");
  else t.push(SO[chuc], "mươi");
  if (dv) t.push(dv === 5 && chuc ? "lăm" : dv === 1 && chuc > 1 ? "mốt" : dv === 4 && chuc > 1 ? "tư" : SO[dv]);
  return t.join(" ");
}

export function docSo(n) {
  n = Math.round(n);
  if (n === 0) return "không";
  const don = ["", "nghìn", "triệu", "tỷ"];
  const nhom = [];
  for (let x = n; x > 0; x = Math.floor(x / 1000)) nhom.push(x % 1000);
  const t = [];
  for (let i = nhom.length - 1; i >= 0; i--) {
    if (!nhom[i]) continue;
    t.push(baChuSo(nhom[i], i < nhom.length - 1), don[i]);
  }
  return t.filter(Boolean).join(" ");
}

/** "4,2 triệu" -> "bốn triệu hai"; "3.500 đ/kWh" -> "ba nghìn năm trăm đồng một số điện" */
export function docTien(s) {
  // JS \b không hiểu chữ có dấu ("tr" trong "trăm" vẫn khớp) -> chặn bằng (?!\p{L})
  return String(s)
    .replace(/(\d+),(\d+)\s*(triệu|tr|tỷ)(?!\p{L})/giu, (_, a, b, d) => `${docSo(+a)} ${/tỷ/i.test(d) ? "tỷ" : "triệu"} ${[...b].map((c) => SO[+c]).join(" ")}`)
    .replace(/(\d+)\s*(triệu|tr)(?!\p{L})/giu, (_, a) => `${docSo(+a)} triệu`)
    .replace(/(\d{1,3}(?:\.\d{3})+|\d+)\s*k(?!\p{L})/giu, (_, a) => `${docSo(+a.replace(/\./g, ""))} nghìn`)
    .replace(/\d{1,3}(?:\.\d{3})+|\d+/g, (a) => docSo(+a.replace(/\./g, "")))
    .replace(/\s*(vnđ|vnd|đồng|đ)(?!\p{L})/giu, " đồng")
    .replace(/\s*\/\s*kwh/gi, " một số điện")
    .replace(/\s*\/\s*m(3|³)/gi, " một khối")
    .replace(/\s*\/\s*/g, " một ")

    .replace(/\s+/g, " ").trim();
}

const CHU_CAI = { A: "a", B: "bê", C: "xê", D: "đê", E: "e", F: "ép", H: "hát", R: "rờ", K: "ca" };
/** "RH682A26" -> "rờ hát sáu tám hai a hai sáu" để đọc rõ từng ký tự */
export const docMa = (ma) => [...ma].map((c) => (/\d/.test(c) ? SO[+c] : CHU_CAI[c] || c.toLowerCase())).join(" ");

const laChinh = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (laChinh) {
  const bo = process.argv[2];
  if (!KICH_BAN[bo]) { console.error(`Dùng: node scripts/long-tieng.mjs <${Object.keys(KICH_BAN).join("|")}>`); process.exit(1); }
  await longTieng(bo, KICH_BAN[bo]);
}
