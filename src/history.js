// Automower error codes caused by the lawn itself (slopes, holes, obstacles), as opposed to hardware or battery faults.
const terrain = new Set([
  'no_drive', 'lifted', 'mower_lifted', 'lifted_in_link_arm', 'upside_down', 'mower_tilted', 'trapped', 'outside_working_area',
  'slope_too_steep', 'cutting_stopped_slope_too_steep', 'slipped_mower_has_slipped_situation_not_solved_with_moving_pattern',
  'cutting_system_blocked', 'cutting_height_blocked', 'auxiliary_cutting_means_blocked', 'chassis_collision',
  'destination_blocked', 'destination_not_reachable', 'water_hose_found_in_working_area',
  'wheel_motor_blocked_left', 'wheel_motor_blocked_right', 'wheel_motor_blocked_rear_left', 'wheel_motor_blocked_rear_right',
  'wheel_motor_overloaded_left', 'wheel_motor_overloaded_right', 'wheel_motor_overloaded_rear_left', 'wheel_motor_overloaded_rear_right',
]);

export function category(code) {
  if (terrain.has(code)) return 'terrain';
  if (['stopped', 'wait_power_up', 'off'].includes(code)) return 'handling';
  if (['low_battery', 'empty_battery'].includes(code)) return 'battery';
  return 'technical';
}

export function episodes(rows, since) {
  const out = []; let current = null, last = null, boundary = false;
  for (const s of [...rows].sort((a, b) => Date.parse(a.last_updated) - Date.parse(b.last_updated))) {
    const t = Date.parse(s.last_updated), code = s.state;
    if (!Number.isFinite(t) || ['unavailable', 'unknown', ''].includes(code)) continue;
    if (t <= since) { last = code; boundary = code !== 'no_error'; continue; }
    if (code === 'no_error') { if (current) current.end = s.last_updated; current = null; last = code; boundary = false; continue; }
    if (boundary || code === last) continue;
    last = code;
    if (current) { current.codes.push(code); continue; }
    current = {id: s.last_updated, start: s.last_updated, end: null, code, codes: [code], category: category(code), located: false};
    out.push(current);
  }
  return out;
}

export function locate(episode, rows, queryStart) {
  const t = Date.parse(episode.start);
  const points = rows.filter(s => !['unknown', 'unavailable'].includes(s.state) && Date.parse(s.last_updated) > queryStart && typeof s.attributes?.latitude === 'number' && typeof s.attributes?.longitude === 'number' && Math.abs(s.attributes.latitude) <= 90 && Math.abs(s.attributes.longitude) <= 180)
    .sort((a, b) => Date.parse(a.last_updated) - Date.parse(b.last_updated));
  // A synthetic state at queryStart does not prove that the GPS was recently published.
  const g = points.filter(s => Date.parse(s.last_updated) <= t + 2000).at(-1);
  if (!g) return {...episode, located: false};
  const age = (t - Date.parse(g.last_updated)) / 1000;
  return {...episode, lat: g.attributes.latitude, lon: g.attributes.longitude, gps_age_s: Math.round(age * 10) / 10, located: age >= -2 && age <= 300};
}

export function clusters(episodes, radius = 10) {
  let rest = episodes.filter(e => e.located); const groups = [];
  const distance = (a, b) => Math.hypot((a.lat - b.lat) * 111320, (a.lon - b.lon) * 111320 * Math.cos(a.lat * Math.PI / 180));
  while (rest.length) {
    let seed = rest[0], max = 0;
    for (const a of rest) { const n = rest.filter(b => distance(a, b) <= radius).length; if (n > max) { max = n; seed = a; } }
    const group = rest.filter(b => distance(seed, b) <= radius), ids = new Set(group.map(e => e.id));
    rest = rest.filter(e => !ids.has(e.id)); const types = {}; for (const e of group) types[e.code] = (types[e.code] || 0) + 1;
    groups.push({zone: groups.length + 1, count: group.length, lat: group.reduce((a, e) => a + e.lat, 0) / group.length, lon: group.reduce((a, e) => a + e.lon, 0) / group.length, types});
  }
  return groups;
}
