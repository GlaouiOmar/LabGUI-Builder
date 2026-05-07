import type { IRNode } from '../types/ir';
import type { GuideLine, SnapResult } from '../types/canvas';
import { GUIDE_SNAP_THRESHOLD } from '../types/canvas';

export interface EdgeSet {
  left: number;
  hCenter: number;
  right: number;
  top: number;
  vCenter: number;
  bottom: number;
}

export function getEdges(node: IRNode): EdgeSet {
  const g = node.geometry;
  return {
    left: g.x,
    hCenter: g.x + g.w / 2,
    right: g.x + g.w,
    top: g.y,
    vCenter: g.y + g.h / 2,
    bottom: g.y + g.h,
  };
}

function findNearest(
  value: number,
  targets: number[],
  threshold: number
): { target: number | undefined; distance: number } {
  let best: number | undefined;
  let bestDist = Infinity;
  for (const t of targets) {
    const dist = Math.abs(value - t);
    if (dist < threshold && dist < bestDist) {
      best = t;
      bestDist = dist;
    }
  }
  return { target: best, distance: bestDist };
}

/**
 * Compute snap position and guide lines for a dragged widget.
 * @param dragged The widget being dragged (with its current trial geometry)
 * @param others All other widgets to align against
 * @param canvasBounds Canvas width/height for guide line extents
 */
export function computeSnap(
  dragged: IRNode,
  others: IRNode[],
  canvasBounds: { w: number; h: number }
): SnapResult {
  const de = getEdges(dragged);

  // Collect all target edges from other widgets
  const hTargets: number[] = [];
  const vTargets: number[] = [];

  for (const o of others) {
    if (o.id === dragged.id) continue;
    const e = getEdges(o);
    hTargets.push(e.left, e.hCenter, e.right);
    vTargets.push(e.top, e.vCenter, e.bottom);
  }

  // Also align to canvas center and edges
  hTargets.push(0, canvasBounds.w / 2, canvasBounds.w);
  vTargets.push(0, canvasBounds.h / 2, canvasBounds.h);

  const snapX = findNearest(de.left, hTargets, GUIDE_SNAP_THRESHOLD);
  const snapXCenter = findNearest(de.hCenter, hTargets, GUIDE_SNAP_THRESHOLD);
  const snapXRight = findNearest(de.right, hTargets, GUIDE_SNAP_THRESHOLD);

  const snapY = findNearest(de.top, vTargets, GUIDE_SNAP_THRESHOLD);
  const snapYCenter = findNearest(de.vCenter, vTargets, GUIDE_SNAP_THRESHOLD);
  const snapYBottom = findNearest(de.bottom, vTargets, GUIDE_SNAP_THRESHOLD);

  let newX: number | undefined;
  let newY: number | undefined;
  let matchedHX: number | undefined;
  let matchedVY: number | undefined;

  // Choose best horizontal snap
  const bestH = [
    { val: snapX.target, dist: snapX.distance, offset: 0 },
    { val: snapXCenter.target, dist: snapXCenter.distance, offset: -dragged.geometry.w / 2 },
    { val: snapXRight.target, dist: snapXRight.distance, offset: -dragged.geometry.w },
  ].filter((x) => x.val !== undefined).sort((a, b) => a.dist - b.dist)[0];

  if (bestH) {
    newX = bestH.val! + bestH.offset;
    matchedHX = bestH.val;
  }

  // Choose best vertical snap
  const bestV = [
    { val: snapY.target, dist: snapY.distance, offset: 0 },
    { val: snapYCenter.target, dist: snapYCenter.distance, offset: -dragged.geometry.h / 2 },
    { val: snapYBottom.target, dist: snapYBottom.distance, offset: -dragged.geometry.h },
  ].filter((x) => x.val !== undefined).sort((a, b) => a.dist - b.dist)[0];

  if (bestV) {
    newY = bestV.val! + bestV.offset;
    matchedVY = bestV.val;
  }

  // Build guide lines
  const guides: GuideLine[] = [];
  if (matchedHX !== undefined) {
    guides.push({
      orientation: 'vertical',
      position: matchedHX,
      from: 0,
      to: canvasBounds.h,
    });
  }
  if (matchedVY !== undefined) {
    guides.push({
      orientation: 'horizontal',
      position: matchedVY,
      from: 0,
      to: canvasBounds.w,
    });
  }

  return {
    x: newX,
    y: newY,
    guides,
  };
}
