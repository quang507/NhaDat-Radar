# Bot đăng tin: tự quy đổi phường cũ → mới, đừng bắt chủ nhà nhớ

Gửi anh Luân (bot AI Ơi Nhà Đất), 28/10/2026.

## Ca lỗi thật

Chủ nhà (tester) nhắn: *"Chị bán nhà ở 125 Bình Long, **Bình Hưng Hòa A**, Bình Tân, 70m2, giá 3 tỷ"*.
Bot đọc được phường (bài rao ghi đúng "phường Bình Hưng Hòa A, Quận Bình Tân") nhưng vẫn hỏi
*"nhà mình thuộc phường nào theo tên phường mới sau sáp nhập"*. Chị không nhớ → bot hỏi 3 lượt → chuyển admin
("Bot hỏi phường 3 lượt chưa ra"). Khách thường không biết tên phường mới; đây là việc hệ thống tự tra được.

Hai lỗi phụ trong cùng hội thoại:
- **Số nhà mâu thuẫn**: tin đầu "125", sau đó chị gõ "138 B" → bot lấy 138B, không hỏi lại số nào đúng.
- **Địa chỉ ghép bị lặp**: "Bình Long, 138B Bình Long, Bình Hưng Hòa A, Bình Tân, Bình Tân" (phần cộng dồn
  `dia_chi` trong schema chưa khử trùng các mảnh).

## Dữ liệu

`data/sap-nhap-phuong-2025.json` (repo Radar, ~1,4MB) - dựng bằng `scripts/xay-bang-phuong.mjs` từ **bảng chuyển đổi
chính thức của Cục Thống kê (NSO)** `danhmuchanhchinh.nso.gov.vn/TAPTIN/BangChuyendoiĐVHCmoi_cu_final.xlsx`
(kiểm SHA-256; căn cứ NQ 202/2025/QH15 và NQ 1654-1687/NQ-UBTVQH15).

- 3.321 xã/phường mới (khớp số chính thức), 10.033 xã/phường cũ.
- **95,6% phường cũ quy đổi thẳng** (gộp trọn / giữ nguyên / đổi tên) → điền luôn, không hỏi.
- **441 phường cũ bị chia** cho ≥ 2 phường mới → chỉ những ca này mới cần hỏi, và hỏi **cho chọn**.
- 58 ca "chia diện tích nhưng toàn bộ dân số sang 1 xã" → nhà dân vẫn chắc chắn thuộc xã đó.

Cấu trúc:
```
xaCu[mã cũ] = { t: tên, q: quận/huyện cũ, qm: mã quận, p: tỉnh cũ,
                v: [[mã xã mới, kiểu, ghi chú NSO nếu không phải toàn bộ], ...] }
xaMoi[mã mới] = { t: tên, p: tỉnh mới }
kiểu: toan_bo | toan_bo_dan_so | mot_phan | giu_nguyen
```

Ví dụ ca trên: `27439 Phường Bình Hưng Hòa A (Quận Bình Tân)` → `Phường Bình Hưng Hòa (mot_phan)`, `Phường Bình Trị Đông (mot_phan)`.

## Luật cho bot

1. Bóc phường / quận / tỉnh **cũ** từ địa chỉ chủ nhà gõ (bot đã làm được).
2. Tra bảng:
   - **Chắc chắn** (1 phường mới, hoặc có dòng `toan_bo_dan_so`) → điền phường mới, **không hỏi**.
   - **Bị chia** → hỏi **một lần, cho chọn tên**:
     *"Từ 1/7/2025 Phường Bình Hưng Hòa A được chia sang 2 phường mới: Bình Hưng Hòa, Bình Trị Đông. Nhà mình thuộc
     phường nào ạ? (Không chắc thì cho em xin số nhà + hẻm, em tra bản đồ giúp.)"*
     Có số nhà + đường thì nên tự geocode và so ranh giới trước khi hỏi.
   - **Tên trùng nhiều quận** ("Phường 1") mà chưa có quận → hỏi quận, không đoán.
   - **Không có trong bảng** → giữ tên cũ.
3. **Không chặn đăng tin vì thiếu tên phường mới.** Tin lên với phường cũ (thị trường vẫn gọi tên cũ; Radar cũng giữ
   tên cũ, xem `src/lib/sap-nhap.ts`), phường mới bổ sung sau. Chuyển admin chỉ khi khách đã chọn mà vẫn mâu thuẫn.
4. Số nhà khác với lần trước → hỏi lại một câu xác nhận ("125 hay 138B ạ?").
5. Ghép địa chỉ: bỏ mảnh trùng (so không dấu) trước khi nối.

## Python (đọc thẳng JSON, cùng logic với `src/lib/phuong-moi.ts`)

```python
import json, re, unicodedata
B = json.load(open("sap-nhap-phuong-2025.json", encoding="utf-8"))

def khong_dau(s):
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if unicodedata.category(c) != "Mn").replace("đ", "d").replace("Đ", "D").lower()

def _loi(s, tien_to):
    s = re.sub(r"[.,]", " ", khong_dau(s))
    s = re.sub(rf"^\s*({tien_to})\s+", "", s)
    s = re.sub(r"\b0+(\d)", r"\1", s)
    return re.sub(r"\s+", " ", s).strip()

loi_xa = lambda s: _loi(s, "phuong|xa|thi tran|p|tt")
loi_quan = lambda s: _loi(s, "quan|huyen|thi xa|thanh pho|tp|q|h|tx")
def loi_tinh(s):
    k = _loi(s, "thanh pho|tinh|tp")
    return "ho chi minh" if k in ("hcm", "tphcm", "ho chi minh", "sai gon", "sg") else k

THEO_TEN = {}
for ma, x in B["xaCu"].items():
    THEO_TEN.setdefault(loi_xa(x["t"]), []).append(ma)

def phuong_moi(phuong, quan=None, tinh=None):
    ds = THEO_TEN.get(loi_xa(phuong), [])
    if tinh:
        loc = [m for m in ds if loi_tinh(B["xaCu"][m]["p"]) == loi_tinh(tinh)]; ds = loc or ds
    if quan:
        loc = [m for m in ds if loi_quan(B["xaCu"][m]["q"]) == loi_quan(quan)]; ds = loc or ds
    if len(ds) != 1:
        return {"chac": None, "ung_vien": [], "trung_ten": [B["xaCu"][m] for m in ds]}
    x = B["xaCu"][ds[0]]
    ung_vien = [B["xaMoi"][v[0]]["t"] for v in x["v"]]
    chac = x["v"][0] if len(x["v"]) == 1 else next((v for v in x["v"] if v[1] in ("toan_bo_dan_so", "toan_bo")), None)
    return {"chac": B["xaMoi"][chac[0]]["t"] if chac else None, "ung_vien": ung_vien, "trung_ten": []}

# phuong_moi("Bình Hưng Hòa A", "Bình Tân", "HCM")
#   -> {"chac": None, "ung_vien": ["Phường Bình Hưng Hòa", "Phường Bình Trị Đông"], ...}  => hỏi cho chọn
# phuong_moi("Bình Hưng Hòa B", "Bình Tân", "HCM")  -> {"chac": "Phường Bình Tân", ...}  => điền luôn
```

Ca kiểm thử chuẩn: `tests/unit/phuong-moi.spec.ts` (Radar) - nên chép sang test của bot.
