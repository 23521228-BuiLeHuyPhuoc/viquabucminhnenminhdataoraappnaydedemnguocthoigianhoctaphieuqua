const valid = (n, fallback) => Number.isFinite(n) ? n : fallback;
function fitBounds(bounds, area, size) {
  const width = Math.min(area.width, Math.max(Math.min(size.minWidth || 1, area.width), valid(bounds.width, size.width)));
  const height = Math.min(area.height, Math.max(Math.min(size.minHeight || 1, area.height), valid(bounds.height, size.height)));
  return { width: Math.round(width), height: Math.round(height),
    x: Math.round(Math.max(area.x, Math.min(area.x + area.width - width, valid(bounds.x, area.x + (area.width - width) / 2)))),
    y: Math.round(Math.max(area.y, Math.min(area.y + area.height - height, valid(bounds.y, area.y + (area.height - height) / 2)))) };
}
function cornerBounds(bounds, area, corner) {
  if (!['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(corner)) throw new Error('Góc không hợp lệ.');
  const fitted = fitBounds(bounds, area, bounds);
  const mx = Math.min(16, (area.width - fitted.width) / 2), my = Math.min(16, (area.height - fitted.height) / 2);
  return { ...fitted,
    x: Math.round(corner.endsWith('right') ? area.x + area.width - fitted.width - mx : area.x + mx),
    y: Math.round(corner.startsWith('bottom') ? area.y + area.height - fitted.height - my : area.y + my) };
}
module.exports = { fitBounds, cornerBounds };
