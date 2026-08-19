/* eslint-disable @typescript-eslint/no-explicit-any */
// Lớp nền bản đồ dùng chung cho ListingMap + MapResults (trước đây 2 file copy y hệt nhau).
//
// "Vệ tinh" KHÔNG phải ảnh trần: người dùng phản hồi 19/8 là ảnh vệ tinh không có tên
// đường thì không biết mình đang nhìn đâu — batdongsan cũng hiện kiểu lai (ảnh + nhãn).
// Esri phát miễn phí đúng bộ lớp cho việc này: ảnh (World_Imagery) + đường
// (World_Transportation) + tên khu vực (World_Boundaries_and_Places), chồng lên nhau.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

export function ganLopNen(L: any, map: any) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const nen = token
    ? L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${token}`,
      { tileSize: 512, zoomOffset: -1, attribution: "© Mapbox © OpenStreetMap" })
    : L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 });

  const veTinh = L.layerGroup([
    L.tileLayer(`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, { attribution: "© Esri", maxZoom: 19 }),
    L.tileLayer(`${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 19 }),
    L.tileLayer(`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 19 }),
  ]);

  // MẶC ĐỊNH là vệ tinh (kèm nhãn): với nhà đất, thứ người mua cần thấy đầu tiên là hiện
  // trạng thật quanh miếng đất. Đổi lại được ở nút góc trên bên phải.
  veTinh.addTo(map);
  L.control.layers({ "Vệ tinh": veTinh, "Bản đồ": nen }, {}, { position: "topright" }).addTo(map);

  // Nút PHÓNG TO toàn màn hình — người dùng muốn xem bản đồ lớn như các sàn chuyên map.
  // Tự viết ~10 dòng thay vì cài plugin: requestFullscreen có sẵn ở mọi trình duyệt hiện đại.
  const NutPhongTo = L.Control.extend({
    options: { position: "topleft" },
    onAdd() {
      const b = L.DomUtil.create("button", "leaflet-bar");
      b.innerHTML = "⛶";
      b.title = "Phóng to toàn màn hình";
      b.style.cssText = "width:34px;height:34px;font-size:18px;cursor:pointer;background:#fff;border:none;display:block";
      L.DomEvent.on(b, "click", (e: Event) => {
        L.DomEvent.stop(e);
        const el = map.getContainer();
        if (document.fullscreenElement) document.exitFullscreen();
        else el.requestFullscreen?.();
      });
      return b;
    },
  });
  map.addControl(new NutPhongTo());
  // ra/vào toàn màn hình thì kích thước khung đổi -> phải báo Leaflet tính lại, không thì tile trắng
  const onFs = () => setTimeout(() => map.invalidateSize(), 120);
  document.addEventListener("fullscreenchange", onFs);
  map.on("remove", () => document.removeEventListener("fullscreenchange", onFs));
}
