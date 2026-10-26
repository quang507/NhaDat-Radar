// Bản đồ dùng chung cho ListingMap + MapResults + PriceMap.
//
// 26/10: bỏ Leaflet + ô gạch raster (OSM thô, chữ nhoè trên màn nét cao - anh Quang: "leaflet xấu quá") sang
// MapLibre GL + OpenFreeMap: bản đồ VECTOR nét như Google/Cozrum, miễn phí không giới hạn lượt xem, được dùng
// thương mại, không cần key. Kiểu "liberty" (sáng) / "dark" (tối) theo theme của web.
//
// "Vệ tinh" KHÔNG phải ảnh trần: người dùng phản hồi 19/8 là ảnh vệ tinh không có tên đường thì không biết
// mình đang nhìn đâu. Ảnh Esri World_Imagery chèn DƯỚI lớp chữ của bản đồ vector -> vẫn có tên đường/khu vực.
// Mặc định giờ là "Bản đồ" (gọn, nhìn ra ngay đường đi); vệ tinh bấm 1 chạm ở góc trên bên trái.
import type { Map as BanDo, IControl, LngLatLike } from "maplibre-gl";

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
    // cuộn trang không bị bản đồ "nuốt" (trước đây scrollWheelZoom:false - không phóng to bằng chuột được luôn)
    cooperativeGestures: true,
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
