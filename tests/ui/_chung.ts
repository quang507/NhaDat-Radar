import { expect, type Page, type TestInfo } from "@playwright/test";

// Dùng chung cho bộ kiểm tra giao diện tests/ui (28/10): soi bố cục bằng SỐ ĐO thay cho nhìn ảnh,
// đúng những lỗi anh Quang từng báo - nhãn vỡ 3 dòng, nhãn đè nút tim, tràn ngang, tiêu đề tàng hình ở nền tối,
// ô tìm kiếm / tin đầu tiên bị đẩy khỏi màn đầu.

export const HCM = "H%E1%BB%93+Ch%C3%AD+Minh";
export const TRANG_TIM = `/search?deal=cho_thue&province=${HCM}`;

/** Khổ hẹp (< lg 1024): điện thoại + tablet - nơi bộ lọc gọn và màn đầu chật nhất */
export const laHep = (page: Page) => (page.viewportSize()?.width ?? 1440) < 1024;
export const laDienThoai = (page: Page) => (page.viewportSize()?.width ?? 1440) < 640;

/** Lỗi JS chưa bắt + lỗi hydrate React - gắn trước page.goto */
export function ghiLoiJs(page: Page): string[] {
  const loi: string[] = [];
  page.on("pageerror", (e) => loi.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.on("console", (m) => {
    if (m.type() === "error" && /hydrat|did not match|Minified React error/i.test(m.text())) loi.push(`react: ${m.text().slice(0, 200)}`);
  });
  return loi;
}

/** Mở trang, đợi chữ + ảnh đầu ổn định (không đợi networkidle: bản đồ / GA tải mãi) */
export async function mo(page: Page, duong: string) {
  const res = await page.goto(duong, { waitUntil: "domcontentloaded", timeout: 60_000 });
  expect(res?.status(), `${duong} phải trả 200`).toBeLessThan(400);
  await page.waitForLoadState("load", { timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(400);
}

// ---- Tin mẫu: lấy từ trang tìm kiếm thật (dữ liệu đổi mỗi ngày nên không ghi cứng id) ----
let tinMau: { roHang: string | null; web: string | null } | null = null;
export async function layTinMau(page: Page) {
  if (tinMau) return tinMau;
  const roHang = await (async () => {
    await mo(page, TRANG_TIM);
    // thẻ phòng rổ hàng mang mã RHxxxxxx
    return page.evaluate(() => {
      const the = [...document.querySelectorAll(".card")].find((c) => /RH[0-9A-F]{6}/.test(c.textContent || ""));
      return the?.querySelector<HTMLAnchorElement>('a[href^="/listings/"]')?.getAttribute("href") ?? null;
    });
  })();
  const web = await (async () => {
    await mo(page, `/search?deal=ban&province=${HCM}`);
    return page.evaluate(() => {
      // tin cào web: thẻ có nhãn nguồn khác "Đã xác minh"/"Tự đăng" (vd batdongsan, chotot, mogi)
      const a = [...document.querySelectorAll<HTMLAnchorElement>('a[href^="/listings/"]')].find((x) => {
        const t = x.closest("article, .card, li, div")?.textContent || "";
        return /batdongsan|chotot|mogi|alonhadat|nhatot|homedy|muaban/i.test(t);
      });
      return a?.getAttribute("href") ?? document.querySelector('a[href^="/listings/"]')?.getAttribute("href") ?? null;
    });
  })();
  tinMau = { roHang, web };
  return tinMau;
}

/**
 * Soi bố cục trang đang mở. Trả về danh sách lỗi (rỗng = sạch). Kiểm:
 *  - tràn ngang (kèm phần tử gây tràn)
 *  - nhãn/nút đè nhau trong thẻ tin (vd "ĐÃ XÁC MINH" chui dưới nút tim)
 *  - nhãn chữ ngắn bị vỡ nhiều dòng (vd "Đã / xác / minh")
 *  - ảnh của chính site hỏng
 *  - chữ gần như tàng hình (tương phản < 3) ở tiêu đề h1 và menu
 *  - điện thoại: nút ở header / thanh dưới cùng thấp hơn 40px
 */
export async function soiBoCuc(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const loi: string[] = [];
    const vw = innerWidth, vh = innerHeight;
    const ten = (e: Element) => {
      const t = (e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 30);
      const cls = (e.getAttribute("class") || "").split(" ").slice(0, 3).join(".");
      return `${e.tagName.toLowerCase()}${cls ? "." + cls : ""}${t ? ` "${t}"` : ""}`;
    };
    const hien = (e: Element) => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && +cs.opacity > 0.05;
    };

    // 1. tràn ngang - bỏ qua phần tử nằm trong khung cuộn ngang (overflow-x auto/scroll/hidden)
    const tran = document.documentElement.scrollWidth - vw;
    if (tran > 1) {
      const thu = [...document.querySelectorAll("body *")].filter((e) => {
        const r = e.getBoundingClientRect(); if (r.right <= vw + 1 || r.width === 0) return false;
        for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
          if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) return false;
        }
        return true;
      });
      const goc = thu.filter((e) => !thu.some((o) => o !== e && e.contains(o))).slice(0, 3);
      loi.push(`tràn ngang ${tran}px do: ${goc.map(ten).join(" | ") || "?"}`);
    }

    // 2 + 3. trong từng thẻ tin
    for (const the of document.querySelectorAll(".card")) {
      if (!hien(the)) continue;
      const tr = the.getBoundingClientRect();
      // phần tử nổi (absolute hoặc nằm trong khối absolute) nhỏ, có chữ hoặc là nút
      const noi = [...the.querySelectorAll("*")].filter((e) => {
        // bản đồ (marker, lời nhắc MapLibre) và lớp phủ trang trí (khung chờ aria-hidden) không phải nhãn của thẻ
        if (!hien(e) || e.closest(".maplibregl-map, [aria-hidden='true']")) return false;
        let abs = false;
        for (let p: Element | null = e; p && p !== the; p = p.parentElement) if (getComputedStyle(p).position === "absolute") { abs = true; break; }
        if (!abs) return false;
        const r = e.getBoundingClientRect();
        if (r.width > tr.width * 0.7 || r.height > 60) return false;
        const coChu = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim());
        return e.tagName === "BUTTON" || coChu;
      });
      for (let i = 0; i < noi.length; i++) for (let j = i + 1; j < noi.length; j++) {
        const a = noi[i], b = noi[j];
        if (a.contains(b) || b.contains(a)) continue;
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (w > 2 && h > 2) loi.push(`đè nhau trong thẻ: ${ten(a)} × ${ten(b)} (${Math.round(w)}×${Math.round(h)}px)`);
      }
      // nhãn ngắn có nền/viền mà chữ rớt nhiều dòng - đếm DÒNG CHỮ THẬT (Range.getClientRects), không lấy chiều cao
      // hộp: ô icon w-11 h-11 cao 44px vẫn chỉ 1 dòng chữ
      for (const e of the.querySelectorAll("span, div, b, small")) {
        if (e.closest(".maplibregl-map")) continue;
        const nut = [...e.childNodes].filter((n) => n.nodeType === 3 && n.textContent!.trim());
        const chu = nut.map((n) => n.textContent!.trim()).join(" ");
        if (chu.length < 2 || chu.length > 24 || !hien(e)) continue;
        const cs = getComputedStyle(e);
        const coNen = !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor) || parseFloat(cs.borderTopWidth) > 0;
        if (!coNen) continue;
        const dong = new Set<number>();
        for (const n of nut) { const r = document.createRange(); r.selectNodeContents(n); for (const q of r.getClientRects()) if (q.width > 1) dong.add(Math.round(q.top)); }
        if (dong.size > 1) loi.push(`nhãn vỡ ${dong.size} dòng: ${ten(e)}`);
      }
    }

    // 4. ảnh của chính site hỏng (ảnh crawl ngoài có SafeImg/onerror lo)
    for (const img of document.querySelectorAll("img")) {
      if (img.complete && img.naturalWidth === 0 && img.currentSrc.startsWith(location.origin) && hien(img)) loi.push(`ảnh hỏng: ${img.currentSrc.replace(location.origin, "")}`);
    }

    // 5. tương phản chữ: h1 + link menu
    const rgb = (s: string) => (s.match(/[\d.]+/g) || []).map(Number);
    const sang = ([r, g, b]: number[]) => { const f = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    // nền đặc gần nhất; gặp gradient / ảnh nền trước thì không đo được -> null (bỏ qua)
    const nen = (e: Element): number[] | null => {
      for (let p: Element | null = e; p; p = p.parentElement) {
        const cs = getComputedStyle(p);
        const c = rgb(cs.backgroundColor); if (c.length >= 3 && (c[3] ?? 1) > 0.5) return c;
        if (cs.backgroundImage !== "none") return null;
      }
      return rgb(getComputedStyle(document.body).backgroundColor);
    };
    for (const e of [...document.querySelectorAll("h1"), ...document.querySelectorAll("header nav a")].filter(hien).slice(0, 12)) {
      const n = nen(e); if (!n) continue;
      const a = sang(rgb(getComputedStyle(e).color)), b = sang(n);
      const tl = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      if (tl < 3) loi.push(`chữ gần tàng hình (tương phản ${tl.toFixed(1)}): ${ten(e)}`);
    }

    // 6. điện thoại: nút header + thanh cố định đáy phải đủ to để bấm
    if (vw < 640) {
      const nut = [...document.querySelectorAll("header a, header button")];
      for (const e of document.querySelectorAll("body *")) {
        const cs = getComputedStyle(e);
        if (cs.position === "fixed" && e.getBoundingClientRect().bottom >= vh - 2 && e.getBoundingClientRect().height < 160) nut.push(...e.querySelectorAll("a, button"));
      }
      for (const e of nut) {
        const r = e.getBoundingClientRect();
        if (!hien(e) || r.top > vh || r.bottom < 0) continue;
        if (r.height < 40) loi.push(`nút khó bấm trên điện thoại (cao ${Math.round(r.height)}px): ${ten(e)}`);
      }
    }
    return [...new Set(loi)];
  });
}

/** Chữ của các nút/link trong thanh cố định sát đáy màn hình (thanh Gọi / Zalo trên điện thoại) */
export async function chuThanhDay(page: Page): Promise<string> {
  return page.evaluate(() => {
    const vh = innerHeight; const ra: string[] = [];
    for (const e of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
      if (cs.position !== "fixed" || r.bottom < vh - 4 || r.top < vh - 160 || r.height === 0) continue;
      for (const n of e.querySelectorAll("a, button")) { const q = n.getBoundingClientRect(); if (q.height > 0 && q.top < vh && q.bottom > 0) ra.push((n.textContent || "").trim()); }
    }
    return ra.join(" | ");
  });
}

/** Phần tử có nằm (ít nhất phần đầu) trong màn hình đầu tiên không */
export async function trongManDau(page: Page, selector: string): Promise<number | null> {
  return page.evaluate((s) => {
    const e = [...document.querySelectorAll(s)].find((x) => x.getBoundingClientRect().height > 0);
    return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null;
  }, selector);
}

/** Đính kèm ảnh màn đầu vào báo cáo khi có lỗi - xem nhanh trong tests/report-html */
export async function dinhAnh(page: Page, info: TestInfo, ten: string) {
  await info.attach(ten, { body: await page.screenshot(), contentType: "image/png" });
}
