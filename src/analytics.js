/**
 * analytics.js — Event tracking
 */

import { inject, track as vaTrack } from '@vercel/analytics';

inject();

export function track(event, properties) {
  vaTrack(event, properties);
}
