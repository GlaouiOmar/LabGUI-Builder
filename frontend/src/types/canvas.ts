/**
 * Canvas rendering types — guides, snap targets, etc.
 */

export interface GuideLine {
  orientation: 'horizontal' | 'vertical';
  position: number; // px coordinate
  from: number; // start of line
  to: number; // end of line
}

export interface SnapResult {
  x?: number;
  y?: number;
  guides: GuideLine[];
}

export const GUIDE_SNAP_THRESHOLD = 6; // px
