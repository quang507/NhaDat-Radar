// Geocode dùng chung: ưu tiên Vietmap (chính xác cho VN, không chặn IP CI),
// fallback Nominatim (OpenStreetMap free). Mọi request có timeout 8s.
const VIETMAP_KEY = process.env.VIETMAP_API_KEY || "";
const NOMINATIM_UA = "NhaDatRadar/1.0 (proptech)";

async function fetchJSON(url, headers = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

// Vietmap: search (text -> ref_id) rồi place (ref_id -> lat/lng)
async function vietmap(query) {
  if (!VIETMAP_KEY) return null;
  const s = await fetchJSON(
    `https://maps.vietmap.vn/api/search/v3?apikey=${VIETMAP_KEY}&text=${encodeURIComponent(query)}`,
  );
  const refId = Array.isArray(s) ? s[0]?.ref_id : null;
  if (!refId) return null;
  const p = await fetchJSON(
    `https://maps.vietmap.vn/api/place/v3?apikey=${VIETMAP_KEY}&refid=${encodeURIComponent(refId)}`,
  );
  const lat = p?.lat ?? p?.latitude ?? p?.geometry?.location?.lat;
  const lng = p?.lng ?? p?.lon ?? p?.longitude ?? p?.geometry?.location?.lng;
  return lat && lng ? { lat: +lat, lng: +lng, src: "vietmap" } : null;
}

// Nominatim (fallback)
async function nominatim(query) {
  const j = await fetchJSON(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q=${encodeURIComponent(query)}`,
    { "User-Agent": NOMINATIM_UA, "Accept-Language": "vi" },
  );
  return Array.isArray(j) && j.length ? { lat: +j[0].lat, lng: +j[0].lon, src: "osm" } : null;
}

// API chính: thử Vietmap trước, không được thì Nominatim
export async function smartGeocode(query) {
  return (await vietmap(query)) || (await nominatim(query));
}

export const usingVietmap = !!VIETMAP_KEY;
