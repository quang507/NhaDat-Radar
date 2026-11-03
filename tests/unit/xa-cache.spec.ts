import { test, expect } from "@playwright/test";
import { xaCacheTin } from "../../crawler/xa-cache.mjs";

// 3/11: lượt nhập rổ hàng xả cache đúng các tin vừa đổi - body phải khớp khuôn tag mà /api/revalidate chấp nhận
const TAG_HOP_LE = /^(tin:[0-9a-f-]{36}|ds-tin)$/i;
const id = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;

type Goi = { url: string; init: RequestInit };
async function chay(ids: string[], secret: string | undefined, traVe = () => new Response("{}")) {
  const goi: Goi[] = [];
  const fetchCu = globalThis.fetch, secretCu = process.env.REVALIDATE_SECRET;
  globalThis.fetch = (async (url: string, init: RequestInit) => { goi.push({ url, init }); return traVe(); }) as typeof fetch;
  if (secret === undefined) delete process.env.REVALIDATE_SECRET; else process.env.REVALIDATE_SECRET = secret;
  try { await xaCacheTin(ids); } finally {
    globalThis.fetch = fetchCu;
    if (secretCu === undefined) delete process.env.REVALIDATE_SECRET; else process.env.REVALIDATE_SECRET = secretCu;
  }
  return goi;
}
const tagsCua = (g: Goi) => JSON.parse(String(g.init.body)).tags as string[];

test("gửi tag tin:<id> + ds-tin qua header bí mật, bỏ trùng", async () => {
  const goi = await chay([id(1), id(2), id(1)], "bi-mat-thu");
  expect(goi).toHaveLength(1);
  expect(goi[0].url).toMatch(/\/api\/revalidate$/);
  expect(goi[0].init.method).toBe("POST");
  expect((goi[0].init.headers as Record<string, string>)["x-revalidate-secret"]).toBe("bi-mat-thu");
  expect(tagsCua(goi[0])).toEqual([`tin:${id(1)}`, `tin:${id(2)}`, "ds-tin"]);
  expect(tagsCua(goi[0]).every((t) => TAG_HOP_LE.test(t))).toBe(true);
});

test("chia lô 500 tag (route nhận tối đa 1.000)", async () => {
  const goi = await chay(Array.from({ length: 1200 }, (_, i) => id(i)), "x");
  expect(goi.map((g) => tagsCua(g).length)).toEqual([500, 500, 201]);
});

test("không có bí mật hoặc không có tin thì không gọi web", async () => {
  expect(await chay([id(1)], undefined)).toHaveLength(0);
  expect(await chay([], "x")).toHaveLength(0);
});

test("web lỗi thì dừng êm, không ném lỗi làm hỏng lượt nhập", async () => {
  const goi = await chay(Array.from({ length: 1200 }, (_, i) => id(i)), "x", () => new Response("no", { status: 401 }));
  expect(goi).toHaveLength(1);
});
