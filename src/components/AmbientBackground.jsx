import React, { useEffect, useRef } from 'react';

/**
 * AmbientBackground - Dynamic productivity atmosphere with mesh gradients and ambient particles
 * Supports:
 * - Multi-layer radial mesh gradients & blurred blobs
 * - Animated Canvas particles: Snow (Tuyết rơi), Stardust (Hạt sao phát sáng), or Off
 */
export default function AmbientBackground({
  visualState = 'idle',
  isMini = false,
  particleMode = 'snow', // 'snow' | 'stardust' | 'off'
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (particleMode === 'off') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = null;
    let width = (canvas.width = canvas.offsetWidth || 360);
    let height = (canvas.height = canvas.offsetHeight || 260);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || 360;
      height = canvas.height = canvas.offsetHeight || 260;
    };
    window.addEventListener('resize', onResize);

    const count = isMini ? 24 : 45;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 1,
      speedY: particleMode === 'snow' ? Math.random() * 0.8 + 0.4 : (Math.random() - 0.5) * 0.4,
      speedX: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.5 + 0.2,
      phase: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    const render = () => {
      t += 0.015;
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        if (particleMode === 'snow') {
          p.y += p.speedY;
          p.x += Math.sin(t + p.phase) * 0.4;
          if (p.y > height + 5) {
            p.y = -5;
            p.x = Math.random() * width;
          }
        } else {
          // Stardust floating
          p.x += p.speedX;
          p.y += p.speedY;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        const alpha = p.opacity * (0.8 + Math.sin(t * 2 + p.phase) * 0.2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.shadowBlur = visualState === 'running' ? 6 : 2;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, [particleMode, isMini, visualState]);

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

      {particleMode !== 'off' && (
        <canvas ref={canvasRef} className="ambient-canvas" />
      )}
    </div>
  );
}
