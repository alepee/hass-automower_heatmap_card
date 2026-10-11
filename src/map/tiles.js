// Esri World Imagery is not equally deep everywhere: beyond the deepest level of an area it serves a
// "Map data not yet available" placeholder tile. Its tilemap service tells which levels really exist.
export const ESRI_IMAGERY = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
export const MAX_NATIVE_ZOOM = 19;
export const MIN_NATIVE_ZOOM = 13;

export function tileXY(lat, lon, z) {
  const n = 2 ** z, rad = lat * Math.PI / 180;
  return {x: Math.floor((lon + 180) / 360 * n), y: Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n)};
}

// Returns the deepest level with real imagery at this point, or MAX_NATIVE_ZOOM when the service cannot be reached.
export async function imageryNativeZoom(lat, lon, fetchJson) {
  for (let z = MAX_NATIVE_ZOOM; z >= MIN_NATIVE_ZOOM; z--) {
    const {x, y} = tileXY(lat, lon, z);
    let result;
    try { result = await fetchJson(`${ESRI_IMAGERY}/tilemap/${z}/${y}/${x}/1/1`); } catch { return MAX_NATIVE_ZOOM; }
    if (!result?.valid) return MAX_NATIVE_ZOOM;
    if (result.data?.[0] === 1) return z;
  }
  return MIN_NATIVE_ZOOM;
}
