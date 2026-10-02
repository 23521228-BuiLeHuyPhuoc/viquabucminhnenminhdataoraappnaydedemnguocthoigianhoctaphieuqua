import React from 'react';

/**
 * AmbientBackground - Modern productivity ambient atmosphere
 * Multi-layer radial mesh gradients, blurred ambient blobs, and subtle tactile noise.
 * Smoothly transitions with task color changes and dynamically reacts to timer interactions
 * (Start: energetic luminous glow, Pause: calm serene state, Reset: soft pulse wave).
 */
export default function AmbientBackground({ visualState = 'idle', isMini = false }) {
  return (
    <div
      className={`ambient-backdrop state-${visualState} ${isMini ? 'is-mini' : 'is-full'}`}
      aria-hidden="true"
    >
      <div className="ambient-mesh" />
      <div className="ambient-blob blob-primary" />
      <div className="ambient-blob blob-secondary" />
      {!isMini && <div className="ambient-blob blob-accent" />}
      <div className="ambient-noise" />
    </div>
  );
}
