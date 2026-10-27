// Bản đồ dùng chung cho ListingMap + MapResults + PriceMap.
//
// 26/10: bỏ Leaflet + ô gạch raster (OSM thô, chữ nhoè trên màn nét cao - anh Quang: "leaflet xấu quá") sang
// MapLibre GL + OpenFreeMap: bản đồ VECTOR nét như Google/Cozrum, miễn phí không giới hạn lượt xem, được dùng
// thương mại, không cần key. Kiểu "liberty" (sáng) / "dark" (tối) theo theme của web.
//
// "Vệ tinh" KHÔNG phải ảnh trần: người dùng phản hồi 19/8 là ảnh vệ tinh không có tên đường thì không biết
// mình đang nhìn đâu. Ảnh Esri World_Imagery chèn DƯỚI lớp chữ của bản đồ vector -> vẫn có tên đường/khu vực.
// Mặc định giờ là "Bản đồ" (gọn, nhìn ra ngay đường đi); vệ tinh bấm 1 chạm ở góc trên bên trái.
import type { Map as BanDo, IControl, LngLatLike, Marker, GeoJSONSource } from "maplibre-gl";

export type MapLibre = typeof import("maplibre-gl");

/** Gốc máy chủ bản đồ - các component gọi preconnect() tới đây ngay lúc render để bắt tay TLS sớm. */
export const MAY_CHU_BAN_DO = "https://tiles.openfreemap.org";

const KIEU_SANG = "https://tiles.openfreemap.org/styles/positron";
const KIEU_TOI = "https://tiles.openfreemap.org/styles/dark";
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

// Chữ của các nút/hướng dẫn mặc định (tiếng Anh) -> tiếng Việt
const LOCALE = {
  "NavigationControl.ZoomIn": "Phóng to",
  "NavigationControl.ZoomOut": "Thu nhỏ",
  "FullscreenControl.Enter": "Xem toàn màn hình",
  "FullscreenControl.Exit": "Thoát toàn màn hình",
  "CooperativeGesturesHandler.WindowsHelpText": "Giữ Ctrl và cuộn chuột để phóng to bản đồ",
  "CooperativeGesturesHandler.MacHelpText": "Giữ ⌘ và cuộn chuột để phóng to bản đồ",
  "CooperativeGesturesHandler.MobileHelpText": "Dùng hai ngón tay để di chuyển bản đồ",
};

function webDangToi() {
  const h = document.documentElement.classList;
  if (h.contains("dark")) return true;
  if (h.contains("light")) return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function batVeTinh(map: BanDo, bat: boolean) {
  const lam = () => {
    if (!map.getSource("ve-tinh")) {
      map.addSource("ve-tinh", {
        type: "raster", tileSize: 256, maxzoom: 19, attribution: "© Esri",
        tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`],
      });
      // chèn ngay dưới lớp chữ đầu tiên: ảnh che nền + đường vẽ, tên đường/khu vực vẫn nằm trên
      const lopChu = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
      map.addLayer({ id: "ve-tinh", type: "raster", source: "ve-tinh", layout: { visibility: "none" } }, lopChu);
    }
    map.setLayoutProperty("ve-tinh", "visibility", bat ? "visible" : "none");
  };
  if (map.isStyleLoaded()) lam(); else map.once("load", lam);
}

// Nút chuyển "Bản đồ | Vệ tinh" (2 nút liền, ≥ 36px; 44px trên màn cảm ứng - xem .ndr-lop trong globals.css)
class NutLopNen implements IControl {
  private el?: HTMLDivElement;
  onAdd(map: BanDo) {
    const el = document.createElement("div");
    el.className = "maplibregl-ctrl ndr-lop";
    const tao = (chu: string, veTinh: boolean) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = chu;
      b.setAttribute("aria-pressed", String(!veTinh));
      b.addEventListener("click", () => {
        batVeTinh(map, veTinh);
        el.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      });
      return b;
    };
    el.append(tao("Bản đồ", false), tao("Vệ tinh", true));
    this.el = el;
    return el;
  }
  onRemove() { this.el?.remove(); }
}

/** Tạo bản đồ theo chuẩn Radar. `center` là [lat, lng] như dữ liệu tin. */
export async function taoBanDo(el: HTMLElement, center: [number, number], zoom: number) {
  const ml: MapLibre = await import("maplibre-gl");
  // MapLibre 6 tự đoán đường dẫn worker từ import.meta.url - qua webpack thì đoán sai ("Worker failed to load").
  // Chỉ thẳng file worker để webpack đóng gói nó thành asset riêng.
  if (!ml.getWorkerUrl()) ml.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
  const map = new ml.Map({
    container: el,
    style: webDangToi() ? KIEU_TOI : KIEU_SANG,
    center: [center[1], center[0]],
    zoom,
    // cuộn trang không bị bản đồ "nuốt" (trước đây scrollWheelZoom:false - không phóng to bằng chuột được luôn).
    // 27/10 (anh Quang): máy tính đưa chuột vào bản đồ cuộn là phóng to luôn, không bắt giữ Ctrl -> chỉ bật
    // chế độ "2 ngón để kéo" trên màn cảm ứng, nơi vuốt 1 ngón vẫn phải cuộn được trang.
    cooperativeGestures: matchMedia("(pointer: coarse)").matches,
    attributionControl: { compact: true },
    dragRotate: false,
    pitchWithRotate: false,
    locale: LOCALE,
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(new ml.FullscreenControl(), "top-right");
  map.addControl(new NutLopNen(), "top-left");
  return { ml, map };
}

/** Pin giá (viên thuốc Emerald có mũi nhọn chỉ xuống điểm). */
export function ghimGia(ml: MapLibre, map: BanDo, lngLat: LngLatLike, chu: string, popupHtml?: string) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "ndr-pin";
  el.textContent = chu;
  const marker = new ml.Marker({ element: el, anchor: "bottom" }).setLngLat(lngLat).addTo(map);
  if (popupHtml) {
    marker.setPopup(new ml.Popup({ offset: 12, closeButton: false, maxWidth: "260px", className: "ndr-popup" }).setHTML(popupHtml));
  }
  return marker;
}

// ===== GOM CỤM PIN (27/10, anh Quang: "làm như HiFriendz") ==============================================
// Thu nhỏ thì các pin gần nhau gộp thành bong bóng "N phòng"; bấm bong bóng thì phóng tới mức vừa đủ tách cụm.
// Dùng cụm GeoJSON có sẵn của MapLibre (supercluster), vẽ bằng HTML marker để giữ kiểu pin ZEN (.ndr-pin/.ndr-cum).
// Nhiều phòng cùng một toà có CÙNG toạ độ (lechToaDo cố định theo toà) -> phóng to bao nhiêu cũng không tách:
// cụm đã ở mức phóng tối đa thì bấm vào hiện danh sách phòng trong toà thay vì phóng tiếp.
export type DiemBanDo = { id: string; lat: number; lng: number; nhan: string; tieuDe?: string; popup?: string };

const NGUON_CUM = "ndr-tin";
const CUM_TOI_DA = 17;   // từ mức này trở lên không gom nữa

export function lopGomCum(ml: MapLibre, map: BanDo, donVi = "tin") {
  const diem = new Map<string, DiemBanDo>();
  const ghim = new Map<string, Marker>();   // "c<cluster_id>" | "p<id>"
  let sanSang = false;

  const duLieu = (): GeoJSON.FeatureCollection<GeoJSON.Point> => ({
    type: "FeatureCollection",
    features: [...diem.values()].map((d) => ({
      type: "Feature", geometry: { type: "Point", coordinates: [d.lng, d.lat] }, properties: { id: d.id },
    })),
  });
  const nguon = () => map.getSource(NGUON_CUM) as GeoJSONSource | undefined;

  const moDanhSach = async (cid: number, toaDo: [number, number], soLuong: number) => {
    const la = await nguon()!.getClusterLeaves(cid, Math.min(soLuong, 30), 0);
    const dong = la.map((f) => diem.get(String(f.properties?.id))).filter(Boolean).map((d) =>
      `<a href="/listings/${encodeURIComponent(d!.id)}"><b>${escAttr(d!.nhan)}</b><span>${escAttr(d!.tieuDe || "")}</span></a>`).join("");
    new ml.Popup({ offset: 14, closeButton: true, maxWidth: "300px", className: "ndr-popup" })
      .setLngLat(toaDo)
      .setHTML(`<div class="ndr-popup-ds"><small>${soLuong} ${donVi} tại vị trí này</small>${dong}</div>`)
      .addTo(map);
  };

  const veLai = () => {
    if (!sanSang || !nguon()) return;
    const conLai = new Set<string>();
    for (const f of map.querySourceFeatures(NGUON_CUM)) {
      const pr = f.properties || {};
      const toaDo = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      if (pr.cluster) {
        // cluster_id có thể bị dùng lại cho cụm khác sau setData -> khoá kèm số lượng để không giữ nhãn cũ
        const khoa = `c${pr.cluster_id}-${pr.point_count}`;
        conLai.add(khoa);
        if (ghim.has(khoa)) continue;
        const el = document.createElement("button");
        el.type = "button";
        el.className = "ndr-cum";
        el.textContent = `${pr.point_count} ${donVi}`;
        el.setAttribute("aria-label", `${pr.point_count} ${donVi} - bấm để xem chi tiết`);
        el.addEventListener("click", async (e) => {
          e.stopPropagation();
          const z = await nguon()!.getClusterExpansionZoom(pr.cluster_id);
          if (z > CUM_TOI_DA || map.getZoom() >= CUM_TOI_DA) moDanhSach(pr.cluster_id, toaDo, pr.point_count);
          else map.easeTo({ center: toaDo, zoom: z, duration: 450 });
        });
        ghim.set(khoa, new ml.Marker({ element: el }).setLngLat(toaDo).addTo(map));
      } else {
        const khoa = "p" + pr.id;
        conLai.add(khoa);
        if (ghim.has(khoa)) continue;
        const d = diem.get(String(pr.id));
        if (d) ghim.set(khoa, ghimGia(ml, map, [d.lng, d.lat], d.nhan, d.popup));
      }
    }
    for (const [khoa, m] of ghim) if (!conLai.has(khoa)) { m.remove(); ghim.delete(khoa); }
  };

  const khoiTao = () => {
    map.addSource(NGUON_CUM, { type: "geojson", data: duLieu(), cluster: true, clusterRadius: 56, clusterMaxZoom: CUM_TOI_DA - 1 });
    // lớp vô hình: nguồn phải có lớp dùng tới thì MapLibre mới dựng ô dữ liệu để querySourceFeatures đọc được
    map.addLayer({ id: NGUON_CUM, type: "circle", source: NGUON_CUM, paint: { "circle-radius": 0, "circle-opacity": 0 } });
    sanSang = true;
    // vẽ lại sau mỗi khung hình KHI nguồn đã nạp đủ ô của mức zoom hiện tại (theo ví dụ HTML cluster của MapLibre).
    // Bản đầu vẽ ở moveend -> ô mức zoom mới chưa nạp, querySourceFeatures trả lẫn cụm cũ + mới, bong bóng cũ không gỡ.
    map.on("render", () => { if (map.isSourceLoaded(NGUON_CUM)) veLai(); });
  };
  if (map.isStyleLoaded()) khoiTao(); else map.once("load", khoiTao);

  return {
    /** Thay toàn bộ điểm trên lớp (gọi lại mỗi khi danh sách đổi). */
    datDiem(ds: DiemBanDo[]) {
      diem.clear();
      for (const d of ds) diem.set(d.id, d);
      // không gỡ hết ghim ở đây: veLai() đối chiếu theo khoá sau khi nguồn nạp xong -> pin giữ nguyên không nháy
      if (sanSang) nguon()?.setData(duLieu());
      else map.once("load", () => nguon()?.setData(duLieu()));
    },
    huy() { ghim.forEach((m) => m.remove()); ghim.clear(); },
  };
}

const escAttr = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
