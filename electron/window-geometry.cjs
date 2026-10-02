const valid = (n, fallback) => (Number.isFinite(n) ? n : fallback);

/**
 * Fit window bounds within display workArea while preserving custom sizes and positions.
 * Only soft-snaps when placed extremely close to screen edges (<= 16px).
 */
function fitBounds(bounds, area, size) {
  const minW = Math.min(size?.minWidth || 1, area.width);
  const minH = Math.min(size?.minHeight || 1, area.height);

  // Preserve user-resized dimensions within [minWidth, workArea.width]
  const width = Math.min(area.width, Math.max(minW, valid(bounds?.width, size?.width || minW)));
  const height = Math.min(area.height, Math.max(minH, valid(bounds?.height, size?.height || minH)));

  // Preserve user position (x, y) if defined, or center on screen
  let x = valid(bounds?.x, area.x + (area.width - width) / 2);
  let y = valid(bounds?.y, area.y + (area.height - height) / 2);

  // Clamp strictly within screen workArea so window never gets lost off-screen
  x = Math.max(area.x, Math.min(area.x + area.width - width, x));
  y = Math.max(area.y, Math.min(area.y + area.height - height, y));

  // Soft snapping ONLY when dragged extremely close to edges (<= 16px)
  const SNAP_DISTANCE = 16;
  if (Math.abs(x - area.x) < SNAP_DISTANCE) {
    x = area.x;
  } else if (Math.abs(x - (area.x + area.width - width)) < SNAP_DISTANCE) {
    x = area.x + area.width - width;
  }

  if (Math.abs(y - area.y) < SNAP_DISTANCE) {
    y = area.y;
  } else if (Math.abs(y - (area.y + area.height - height)) < SNAP_DISTANCE) {
    y = area.y + area.height - height;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
    x: Math.round(x),
    y: Math.round(y),
  };
}

/**
 * Snap window to a specific corner of the display.
 */
function cornerBounds(bounds, area, corner) {
  if (!['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(corner)) {
    throw new Error('Góc không hợp lệ.');
  }
  const fitted = fitBounds(bounds, area, bounds);
  const mx = 16;
  const my = 16;
  return {
    ...fitted,
    x: Math.round(corner.endsWith('right') ? area.x + area.width - fitted.width - mx : area.x + mx),
    y: Math.round(corner.startsWith('bottom') ? area.y + area.height - fitted.height - my : area.y + my),
  };
}

module.exports = { fitBounds, cornerBounds };
