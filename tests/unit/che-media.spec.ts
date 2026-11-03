import { test, expect } from "@playwright/test";
import { cheMedia, conLoNguon } from "../../crawler/che-media.mjs";
import nextConfig from "../../next.config.mjs";

// 3/11: URL ảnh/video rổ hàng che qua /m của Radar - bảng tiền tố (che-media.mjs) và rewrites (next.config.mjs)
// phải khớp: đổi một bên mà quên bên kia là ảnh vỡ hàng loạt
const HF = "https://firebasestorage.googleapis.com/v0/b/hifriendz-agent.firebasestorage.app/o/listings%2Fuploads%2F30600db0-IMG_1.jpg?alt=media&token=0bbb1bce";
const EH = "https://media.evohome.it.com/transaction-units/f56fa7fa-ac7e.jpg";

// mô phỏng rewrite: "/m/h/:f" -> destination với :f / :p* thay bằng phần còn lại của đường dẫn
async function moLai(u: string) {
  const url = new URL(u);
  for (const r of await nextConfig.rewrites!() as { source: string; destination: string }[]) {
    const goc = r.source.replace(/:\w+\*?$/, "");
    if (url.pathname.startsWith(goc)) return r.destination.replace(/:\w+\*?$/, url.pathname.slice(goc.length)) + url.search;
  }
  return null;
}

test("cheMedia: không còn lộ tên đối tác, rewrite trả về đúng URL gốc", async () => {
  for (const goc of [HF, EH, HF.replace(".jpg", ".mp4")]) {
    const che = cheMedia(goc);
    expect(che.startsWith("https://nhadatradar.com/m/")).toBe(true);
    expect(conLoNguon(che)).toBe(false);
    expect(await moLai(che)).toBe(goc);
  }
});

test("cheMedia: URL nguồn khác và URL đã che giữ nguyên", () => {
  const khac = "https://cdn.chotot.com/abc.jpg";
  expect(cheMedia(khac)).toBe(khac);
  expect(cheMedia(cheMedia(EH))).toBe(cheMedia(EH));
});
