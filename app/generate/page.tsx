'use client';
// Trigger redeploy to refresh Vercel routing cache after project rename

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { fileToImage } from '@/lib/heic';
import { renderPostcard, renderStampSeal } from '@/lib/renderPostcard';
import { renderPassport } from '@/lib/renderPassport';
import { boothCapture } from '@/lib/camera';
import { preloadBrand, BRAND } from '@/lib/loadImg';
import { randomStampConfig, runStampSlam, StampConfig } from '@/lib/stamp';
import { generateVisaClass } from '@/lib/visa';

// Create a nice profile placeholder silhouette when no photo is uploaded
function createPlaceholderImage(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#FBF7EC'; // cream background
  ctx.fillRect(0, 0, 400, 400);

  ctx.fillStyle = '#0A6B3C'; // green deep
  // Draw head
  ctx.beginPath();
  ctx.arc(200, 150, 65, 0, Math.PI * 2);
  ctx.fill();

  // Draw shoulders
  ctx.beginPath();
  ctx.arc(200, 360, 130, Math.PI, 0);
  ctx.fill();
  
  return canvas;
}

// Synthesize a wet rubber ink stamp thud/splat sound using Web Audio API
function playSplatSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();

    // 1. Heavy low-frequency thud (oscillator)
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.18);
    
    oscGain.gain.setValueAtTime(0.8, audioCtx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
    
    // 2. Ink-splat squish noise
    const bufferSize = audioCtx.sampleRate * 0.15;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(300, audioCtx.currentTime);
    noiseFilter.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.12);
    
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
    
    osc.connect(oscGain);
    oscGain.connect(audioCtx.destination);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.18);
    noise.start();
    noise.stop(audioCtx.currentTime + 0.15);
  } catch (e) {
    console.error('Audio synthesis failed:', e);
  }
}

interface AppState {
  image: HTMLImageElement | null;
  name: string;
  role: string;
  format: 'postcard' | 'passport';
  halftone: boolean;
  panX: number;
  panY: number;
  zoom: number;
  stampConfig: StampConfig | null;
  
  loading: boolean;
  loadingMsg: string;
  error: string | null;
  sharing: boolean;
  shareUrl: string | null;
  countdownNum: number | null;
  rendered: boolean;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isAnimatingRef = useRef(false);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Gesture handling refs
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const startPanRef = useRef({ x: 0, y: 0 });
  const lastTouchDistRef = useRef<number | null>(null);

  const [state, setState] = useState<AppState>({
    image: null,
    name: '',
    role: '',
    format: 'postcard',
    halftone: true,
    panX: 0,
    panY: 0,
    zoom: 1,
    stampConfig: null,
    loading: false,
    loadingMsg: '',
    error: null,
    sharing: false,
    shareUrl: null,
    countdownNum: null,
    rendered: false,
  });

  // Preload brand assets on mount
  useEffect(() => { 
    preloadBrand(); 
  }, []);

  // ── Redraw Canvas whenever states change ───────────────────────────
  useEffect(() => {
    if (!canvasRef.current || isAnimatingRef.current) return;

    let cancelled = false;

    async function draw() {
      const canvas = canvasRef.current!;
      
      // Fall back to a profile silhouette when no image is uploaded
      let imgSource = state.image;
      if (!imgSource) {
        imgSource = createPlaceholderImage() as unknown as HTMLImageElement;
      }

      let result: HTMLCanvasElement;
      if (state.format === 'postcard') {
        result = await renderPostcard({
          image: imgSource!,
          halftone: state.halftone,
          stampConfig: state.stampConfig,
          panX: state.panX,
          panY: state.panY,
          zoom: state.zoom,
        });
      } else {
        result = await renderPassport({
          image: imgSource!,
          name: state.name,
          role: state.role,
          halftone: state.halftone,
          stampConfig: state.stampConfig,
          panX: state.panX,
          panY: state.panY,
          zoom: state.zoom,
        });
      }

      if (!cancelled) {
        canvas.width = result.width;
        canvas.height = result.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(result, 0, 0);
        setState(s => ({ ...s, rendered: true }));
      }
    }

    draw();

    return () => {
      cancelled = true;
    };
  }, [
    state.image,
    state.name,
    state.role,
    state.format,
    state.halftone,
    state.panX,
    state.panY,
    state.zoom,
    state.stampConfig,
  ]);

  // ── File Upload ────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    setState(s => ({ ...s, loading: true, loadingMsg: 'Loading photo…', error: null }));
    const img = await fileToImage(file, msg => setState(s => ({ ...s, error: msg, loading: false })));
    if (img) {
      setState(s => ({ 
        ...s, 
        image: img, 
        loading: false, 
        stampConfig: null, // Clear stamp on new photo
        panX: 0, 
        panY: 0, 
        zoom: 1 
      }));
    }
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) handleFile(f);
    e.target.value = '';
  }, [handleFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, [handleFile]);

  // ── Booth Mode ────────────────────────────────────────────────
  const handleBooth = useCallback(async () => {
    setState(s => ({ ...s, loading: true, loadingMsg: 'Starting camera…', countdownNum: null }));
    const result = await boothCapture(
      n => setState(s => ({ ...s, countdownNum: n })),
      msg => setState(s => ({ ...s, error: msg, loading: false, countdownNum: null }))
    );
    if (result) {
      setState(s => ({ 
        ...s, 
        image: result.image, 
        loading: false, 
        countdownNum: null,
        stampConfig: null, // Clear stamp on new photo
        panX: 0, 
        panY: 0, 
        zoom: 1
      }));
    } else {
      setState(s => ({ ...s, loading: false, countdownNum: null }));
    }
  }, []);

  // ── Stamp Slam Action ─────────────────────────────────────────
  const handleSlam = useCallback(async () => {
    if (isAnimatingRef.current) return;
    
    let imgSource = state.image;
    if (!imgSource) {
      imgSource = createPlaceholderImage() as unknown as HTMLImageElement;
    }
    
    setState(s => ({ ...s, loading: true, loadingMsg: 'Inking stamp…' }));
    
    // Render base card (no stamp)
    let baseCard: HTMLCanvasElement;
    if (state.format === 'postcard') {
      baseCard = await renderPostcard({
        image: imgSource!,
        halftone: state.halftone,
        stampConfig: null,
        panX: state.panX,
        panY: state.panY,
        zoom: state.zoom,
      });
    } else {
      baseCard = await renderPassport({
        image: imgSource!,
        name: state.name,
        role: state.role,
        halftone: state.halftone,
        stampConfig: null,
        panX: state.panX,
        panY: state.panY,
        zoom: state.zoom,
      });
    }
    
    setState(s => ({ ...s, loading: false }));
    
    baseCanvasRef.current = baseCard;
    isAnimatingRef.current = true;
    
    const config = randomStampConfig();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = baseCard.width;
    canvas.height = baseCard.height;
    
    const format = state.format;
    const stampSize = format === 'postcard' ? 210 : 160;
    const stampSealCanvas = renderStampSeal(stampSize);
    
    let tx = 0;
    let ty = 0;
    
    if (format === 'postcard') {
      const margin = 36;
      const sx = config.cornerX === 'left' ? margin : baseCard.width - margin - stampSize;
      const sy = config.cornerY === 'top' ? margin : baseCard.height - margin - stampSize;
      tx = sx + stampSize / 2;
      ty = sy + stampSize / 2;
    } else {
      tx = 890;
      ty = 144;
    }
    
    let lastPhase = 'idle';
    
    runStampSlam(
      (animState) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. Shaking paper visual feedback
        let shakeX = 0;
        let shakeY = 0;
        if (animState.phase === 'impact' || animState.phase === 'bounce') {
          const intensity = animState.phase === 'impact' ? 9 : 3;
          shakeX = (Math.random() - 0.5) * intensity * (1 - animState.progress);
          shakeY = (Math.random() - 0.5) * intensity * (1 - animState.progress);
        }
        
        ctx.drawImage(baseCard, shakeX, shakeY);
        
        // 2. Play synth splat sound on impact
        if (animState.phase === 'impact' && lastPhase === 'falling') {
          playSplatSound();
        }
        lastPhase = animState.phase;
        
        // 3. Draw animating stamp overlay
        if (animState.phase !== 'done') {
          ctx.save();
          ctx.translate(tx, ty);
          ctx.rotate((config.rotation * Math.PI) / 180);
          
          let currentScale = animState.scale;
          if (animState.phase === 'falling') {
            // Drop scale down from 3.5x to 1x
            currentScale = 1.0 + 2.5 * (1 - animState.progress);
          }
          
          const currentSquash = animState.squash;
          ctx.scale(currentScale * (2.0 - currentSquash), currentScale * currentSquash);
          ctx.globalAlpha = animState.opacity;
          
          ctx.drawImage(stampSealCanvas, -stampSize / 2, -stampSize / 2);
          ctx.restore();
        }
      },
      () => {
        isAnimatingRef.current = false;
        setState(s => ({ ...s, stampConfig: config }));
      }
    );
  }, [
    state.image,
    state.name,
    state.role,
    state.format,
    state.halftone,
    state.panX,
    state.panY,
    state.zoom,
  ]);

  // ── Download as PNG ───────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hhgoa2026-${state.format}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, [state.format]);

  // ── Share to X ────────────────────────────────────────────────
  const CAPTION = 'Passport stamped ✅ Postcard sent from HACKER HOUSE गोवा 🏝️ 28–31 Oct — #FrameInGoa';

  const handleShare = useCallback(async () => {
    const canvas = canvasRef.current; if (!canvas) return;
    setState(s => ({ ...s, sharing: true, error: null }));

    try {
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => b ? res(b) : rej(), 'image/png')
      );
      const pngFile = new File([blob], 'hhgoa2026-postcard.png', { type: 'image/png' });

      // Mobile share native attach
      if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [pngFile] })) {
        await navigator.share({ files: [pngFile], title: 'Postcard from HACKER HOUSE Goa 2026', text: CAPTION });
        setState(s => ({ ...s, sharing: false }));
        return;
      }

      // Desktop flow: auto download, POST to Blob, and redirect to tweet
      const localUrl = URL.createObjectURL(blob);
      const dl = document.createElement('a'); dl.href = localUrl; dl.download = pngFile.name; dl.click();
      URL.revokeObjectURL(localUrl);

      let tweetUrl: string;
      try {
        const fd = new FormData();
        fd.append('image', blob, 'postcard.png');
        const res = await fetch('/api/share', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.id) {
          const sharePageUrl = `${window.location.origin}/s/${data.id}`;
          setState(s => ({ ...s, shareUrl: sharePageUrl }));
          tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(CAPTION)}&url=${encodeURIComponent(sharePageUrl)}`;
        } else throw new Error();
      } catch {
        tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(CAPTION)}`;
      }

      window.open(tweetUrl, '_blank', 'noopener,noreferrer');
      setState(s => ({ ...s, sharing: false }));
    } catch {
      setState(s => ({ ...s, sharing: false, error: 'Share failed — try downloading and posting manually.' }));
    }
  }, [CAPTION]);

  // ── Gesture Event Handlers ────────────────────────────────────
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!state.image || isAnimatingRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    isDraggingRef.current = true;
    dragStartRef.current = { x: clientX, y: clientY };
    startPanRef.current = { x: state.panX, y: state.panY };
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingRef.current || !state.image || isAnimatingRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;

    const sens = 150 * state.zoom;
    const nextPanX = Math.max(-1, Math.min(1, startPanRef.current.x - dx / sens));
    const nextPanY = Math.max(-1, Math.min(1, startPanRef.current.y - dy / sens));

    setState(s => ({ ...s, panX: nextPanX, panY: nextPanY, stampConfig: null }));
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!state.image || isAnimatingRef.current) return;
    e.preventDefault();
    const zoomDelta = -e.deltaY * 0.005;
    const nextZoom = Math.max(1, Math.min(5, state.zoom + zoomDelta));
    setState(s => ({ ...s, zoom: nextZoom, stampConfig: null }));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!state.image || isAnimatingRef.current) return;
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      startPanRef.current = { x: state.panX, y: state.panY };
      lastTouchDistRef.current = null;
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!state.image || isAnimatingRef.current) return;
    if (e.touches.length === 1 && isDraggingRef.current) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      const sens = 150 * state.zoom;
      const nextPanX = Math.max(-1, Math.min(1, startPanRef.current.x - dx / sens));
      const nextPanY = Math.max(-1, Math.min(1, startPanRef.current.y - dy / sens));
      setState(s => ({ ...s, panX: nextPanX, panY: nextPanY, stampConfig: null }));
    } else if (e.touches.length === 2 && lastTouchDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / lastTouchDistRef.current;
      const nextZoom = Math.max(1, Math.min(5, state.zoom * ratio));
      setState(s => ({ ...s, zoom: nextZoom, stampConfig: null }));
      lastTouchDistRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    lastTouchDistRef.current = null;
  };

  const hasImage = !!state.image;
  const visaClass = generateVisaClass(state.name);

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 50%, var(--green-mid) 0%, var(--green-deep) 100%)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(251,247,236,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a 
            href="/" 
            style={{ 
              color: 'var(--cream)', 
              textDecoration: 'none', 
              fontFamily: 'var(--font-mono)', 
              fontSize: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: 'rgba(251,247,236,0.08)', 
              padding: '6px 12px', 
              borderRadius: '6px', 
              transition: 'all 0.2s',
              border: '1px solid rgba(251,247,236,0.15)',
              fontWeight: 'bold',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--yellow)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(251,247,236,0.08)'; e.currentTarget.style.color = 'var(--cream)'; }}
          >
            ← Exit Portal
          </a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.wordmark} alt="HACKER HOUSE" style={{ height: '36px', width: 'auto' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.goaSticker} alt="गोवा" style={{ height: '34px', width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(251,247,236,0.5)', fontFamily: 'var(--font-mono)' }}>
            GOA · 28–31 OCT 2026
          </span>
          <span style={{ background: 'var(--yellow)', color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontWeight: 'bold', fontSize: '11px', padding: '3px 10px', borderRadius: '3px', letterSpacing: '0.08em' }}>
            #FrameInGoa
          </span>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 380px',
        maxWidth: '1300px',
        margin: '0 auto',
        width: '100%',
      }}>

        {/* ── Canvas Area ── */}
        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', position: 'relative' }}>

          <div 
            className="canvas-frame"
            style={{ 
              position: 'relative', 
              width: '100%', 
              maxWidth: state.format === 'postcard' ? '460px' : '620px',
              cursor: hasImage ? 'move' : 'default',
              userSelect: 'none',
              touchAction: 'none',
            }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Countdown overlay */}
            {state.countdownNum !== null && state.countdownNum > 0 && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(10,107,60,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                <span key={state.countdownNum} className="animate-countdown" style={{ fontFamily: 'var(--font-serif)', fontSize: '120px', color: 'var(--cream)' }}>
                  {state.countdownNum}
                </span>
              </div>
            )}

            <canvas
              ref={canvasRef}
              id="builder-pass-canvas"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: '8px',
                boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
                border: '1px solid rgba(251,247,236,0.12)',
              }}
            />

            {/* Gesture Hint overlay */}
            {hasImage && !state.stampConfig && (
              <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(17,17,17,0.78)',
                color: 'var(--cream)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '10px',
                pointerEvents: 'none',
                fontFamily: 'var(--font-mono)',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                letterSpacing: '0.02em',
              }}>
                🖱️ Drag photo to pan · Scroll/pinch to zoom
              </div>
            )}

            {/* Upload overlay when no image */}
            {!hasImage && (
              <div
                id="upload-overlay"
                onClick={() => fileInputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={e => e.preventDefault()}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '8px',
                  background: 'rgba(10,107,60,0.72)',
                  backdropFilter: 'blur(3px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  gap: '14px',
                  border: '2px dashed rgba(255,212,0,0.5)',
                }}
              >
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', color: 'var(--cream)', textShadow: '0 2px 8px rgba(0,0,0,0.6)', textAlign: 'center', padding: '0 20px', margin: 0 }}>
                  📸 Tap to add your photo
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'rgba(251,247,236,0.65)', margin: 0 }}>
                  JPG · PNG · HEIC — any crop
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button id="overlay-upload" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }} style={btn('var(--cream)', 'var(--green-deep)')}>
                    📁 Upload
                  </button>
                  <button id="overlay-booth" onClick={e => { e.stopPropagation(); handleBooth(); }} style={btn('var(--pink)', '#fff')}>
                    📸 Booth
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons below canvas */}
          {hasImage && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button id="btn-rephoto" onClick={() => fileInputRef.current?.click()} style={btn('rgba(251,247,236,0.15)', 'var(--cream)', true)}>
                🔄 Change Photo
              </button>
              <button id="btn-booth" onClick={handleBooth} style={btn('rgba(251,247,236,0.15)', 'var(--cream)', true)}>
                📸 Booth
              </button>
              <button id="btn-download" onClick={handleDownload} style={btn('var(--yellow)', 'var(--ink)')}>
                ⬇ Download PNG
              </button>
              <button
                id="btn-share"
                onClick={handleShare}
                disabled={state.sharing}
                style={{ ...btn('var(--ink)', 'var(--cream)'), border: '1px solid rgba(251,247,236,0.25)' }}
              >
                {state.sharing ? '⏳ Sharing…' : '𝕏 Share to X'}
              </button>
            </div>
          )}

          {state.shareUrl && (
            <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--yellow)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
              ✅ Uploaded to Blob + X tab opened! <a href={state.shareUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--yellow)', textDecoration: 'underline' }}>Open share page</a>
            </p>
          )}
        </section>

        {/* ── Sidebar ── */}
        <aside className="glass-sidebar">

          {/* Choose Format */}
          <section>
            <label style={labelSt}>Choose Format</label>
            <div className="premium-tab-container" style={{ marginTop: '8px' }}>
              <button 
                onClick={() => setState(s => ({ ...s, format: 'postcard', stampConfig: null }))}
                className={`tab-btn ${state.format === 'postcard' ? 'tab-btn-active' : ''}`}
              >
                📬 Postcard
              </button>
              <button 
                onClick={() => setState(s => ({ ...s, format: 'passport', stampConfig: null }))}
                className={`tab-btn ${state.format === 'passport' ? 'tab-btn-active' : ''}`}
              >
                🛂 Passport ID
              </button>
            </div>
          </section>

          {/* Photo Treatment */}
          <section>
            <label style={labelSt}>Photo Treatment</label>
            <div className="premium-tab-container" style={{ marginTop: '8px' }}>
              <button 
                onClick={() => setState(s => ({ ...s, halftone: true, stampConfig: null }))}
                className={`tab-btn ${state.halftone ? 'tab-btn-active' : ''}`}
              >
                🟢 Press Print
              </button>
              <button 
                onClick={() => setState(s => ({ ...s, halftone: false, stampConfig: null }))}
                className={`tab-btn ${!state.halftone ? 'tab-btn-active' : ''}`}
              >
                ✨ Glossy
              </button>
            </div>
          </section>

          {/* Image Position adjustments */}
          {hasImage && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={labelSt}>Position & Scale</label>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(251,247,236,0.6)' }}>
                  <span>🔍 Zoom ({state.zoom.toFixed(1)}x)</span>
                  <button onClick={() => setState(s => ({ ...s, zoom: 1, panX: 0, panY: 0, stampConfig: null }))} style={{ background: 'none', border: 'none', color: 'var(--yellow)', cursor: 'pointer', fontSize: '10px' }}>Reset</button>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  step="0.05" 
                  value={state.zoom} 
                  onChange={e => setState(s => ({ ...s, zoom: parseFloat(e.target.value), stampConfig: null }))} 
                  style={{ width: '100%', accentColor: 'var(--yellow)', marginTop: '4px' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(251,247,236,0.6)' }}>
                  <span>↔ Pan Horizontal ({Math.round(state.panX * 100)}%)</span>
                </div>
                <input 
                  type="range" 
                  min="-1" 
                  max="1" 
                  step="0.02" 
                  value={state.panX} 
                  onChange={e => setState(s => ({ ...s, panX: parseFloat(e.target.value), stampConfig: null }))} 
                  style={{ width: '100%', accentColor: 'var(--cream)', marginTop: '4px' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(251,247,236,0.6)' }}>
                  <span>↕ Pan Vertical ({Math.round(state.panY * 100)}%)</span>
                </div>
                <input 
                  type="range" 
                  min="-1" 
                  max="1" 
                  step="0.02" 
                  value={state.panY} 
                  onChange={e => setState(s => ({ ...s, panY: parseFloat(e.target.value), stampConfig: null }))} 
                  style={{ width: '100%', accentColor: 'var(--cream)', marginTop: '4px' }}
                />
              </div>
            </section>
          )}

          {/* Name */}
          <section>
            <label style={labelSt}>Builder Name {state.format === 'passport' && '*'}</label>
            <input
              id="input-name"
              type="text"
              value={state.name}
              onChange={e => setState(s => ({ ...s, name: e.target.value, stampConfig: null }))}
              placeholder="YOUR NAME"
              maxLength={30}
              className="input-premium"
            />
          </section>

          {/* Role */}
          <section>
            <label style={labelSt}>Occupation / Role</label>
            <input
              id="input-role"
              type="text"
              value={state.role}
              onChange={e => setState(s => ({ ...s, role: e.target.value, stampConfig: null }))}
              placeholder="FULL-STACK DEVELOPER"
              maxLength={32}
              className="input-premium"
            />
          </section>

          {/* Visa Class dynamic preview */}
          {state.name && (
            <div style={{
              background: 'rgba(255,212,0,0.12)',
              border: '1px dashed var(--yellow)',
              borderRadius: '4px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              <span style={{ fontSize: '10px', color: 'var(--yellow)', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>🛂 AUTO-GENERATED VISA CLASS</span>
              <span style={{ fontSize: '12px', color: 'var(--cream)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{visaClass}</span>
            </div>
          )}

          {/* Signature Stamp Slam Action Button */}
          <section style={{ marginTop: '8px' }}>
            <button 
              id="btn-stamp-slam"
              onClick={handleSlam}
              disabled={isAnimatingRef.current}
              className={`btn-slam-premium ${state.stampConfig ? 'btn-slam-applied' : ''}`}
            >
              {isAnimatingRef.current ? '💥 Slamming Stamp…' : state.stampConfig ? '💥 Re-Slam Entry Stamp' : '💥 Slam Entry Stamp'}
            </button>
            <p style={{ marginTop: '8px', fontSize: '11px', color: 'rgba(251,247,236,0.45)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
              Slams ink stamp down with sound & shake
            </p>
          </section>

          {/* Download & Share */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(251,247,236,0.1)', paddingTop: '20px' }}>
            <button id="sidebar-download" onClick={handleDownload} style={{ ...btn('var(--yellow)', 'var(--ink)'), width: '100%' }}>
              ⬇ Download PNG
            </button>
            <button
              id="sidebar-share"
              onClick={handleShare}
              disabled={state.sharing}
              style={{ ...btn('var(--ink)', 'var(--cream)'), width: '100%', border: '1px solid rgba(251,247,236,0.2)' }}
            >
              {state.sharing ? '⏳ Sharing…' : '𝕏 Share to X · #FrameInGoa'}
            </button>
          </section>

          {/* Footer note */}
          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(251,247,236,0.3)', fontFamily: 'var(--font-mono)', lineHeight: 1.7 }}>
              All processing is 100% client-side.<br />
              No photo stored without your Share action.<br />
              <span style={{ color: 'var(--yellow)' }}>#FrameInGoa</span> · 2:47 PM STUDIO
            </p>
          </div>
        </aside>
      </main>

      {/* Loading overlay */}
      {state.loading && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(10,107,60,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          {state.countdownNum !== null && state.countdownNum > 0 ? (
            <span key={state.countdownNum} className="animate-countdown" style={{ fontFamily: 'var(--font-serif)', fontSize: '140px', color: 'var(--cream)' }}>
              {state.countdownNum}
            </span>
          ) : (
            <>
              <span className="animate-spin" style={{ fontSize: '40px' }}>⏳</span>
              <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--cream)', fontSize: '16px' }}>{state.loadingMsg}</p>
            </>
          )}
        </div>
      )}

      {/* Error toast */}
      {state.error && (
        <div
          onClick={() => setState(s => ({ ...s, error: null }))}
          style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: 'var(--pink)', color: '#fff', padding: '12px 20px', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '14px', zIndex: 60, maxWidth: '400px', textAlign: 'center', cursor: 'pointer' }}
        >
          {state.error}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*,.heic" onChange={onFileChange} style={{ display: 'none' }} id="file-input" />

      <style>{`
        .glass-sidebar {
          border-left: 1px solid rgba(251, 247, 236, 0.15);
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          overflow-y: auto;
          background: rgba(8, 46, 35, 0.55);
          backdrop-filter: blur(20px);
          box-shadow: -10px 0 30px rgba(0, 0, 0, 0.25);
        }
        .input-premium {
          width: 100%;
          margin-top: 6px;
          padding: 12px 16px;
          background: rgba(251, 247, 236, 0.04);
          border: 1px solid rgba(251, 247, 236, 0.15);
          border-radius: 8px;
          color: var(--cream);
          font-family: var(--font-mono);
          font-size: 14px;
          outline: none;
          letter-spacing: 0.02em;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .input-premium:focus {
          border-color: var(--yellow);
          background: rgba(251, 247, 236, 0.08);
          box-shadow: 0 0 0 4px rgba(255, 212, 0, 0.12);
        }
        .premium-tab-container {
          display: flex;
          background: rgba(17, 17, 17, 0.25);
          padding: 4px;
          border-radius: 8px;
          border: 1px solid rgba(251, 247, 236, 0.08);
          gap: 4px;
        }
        .tab-btn {
          flex: 1;
          padding: 10px 14px;
          font-family: var(--font-mono);
          font-weight: bold;
          font-size: 12px;
          letter-spacing: 0.03em;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: none;
          background: transparent;
          color: rgba(251, 247, 236, 0.6);
        }
        .tab-btn:hover {
          color: var(--cream);
          background: rgba(251, 247, 236, 0.04);
        }
        .tab-btn-active {
          background: var(--cream) !important;
          color: var(--green-deep) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .canvas-frame {
          position: relative;
          transition: all 0.3s ease;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 35px 90px rgba(0, 0, 0, 0.65);
        }
        .canvas-frame:hover {
          box-shadow: 0 45px 110px rgba(0, 0, 0, 0.75);
          transform: translateY(-2px);
        }
        .btn-slam-premium {
          background: var(--pink);
          color: #fff;
          border: 1px solid rgba(251, 247, 236, 0.2);
          border-radius: 8px;
          padding: 14px 20px;
          font-family: var(--font-mono);
          font-weight: bold;
          font-size: 14px;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
          box-shadow: 0 6px 20px rgba(236, 30, 121, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn-slam-premium:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(236, 30, 121, 0.45);
          filter: brightness(1.1);
        }
        .btn-slam-premium:active {
          transform: translateY(1px);
        }
        .btn-slam-applied {
          background: var(--green-mid);
          box-shadow: 0 4px 12px rgba(13, 122, 70, 0.3);
        }
        .btn-slam-applied:hover {
          box-shadow: 0 6px 18px rgba(13, 122, 70, 0.45);
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: rgba(251, 247, 236, 0.15);
          height: 6px;
          border-radius: 3px;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--yellow);
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        @media (max-width: 768px) {
          main { grid-template-columns: 1fr !important; }
          .glass-sidebar { border-left: none !important; border-top: 1px solid rgba(251,247,236,0.12) !important; }
        }
      `}</style>
    </div>
  );
}

// ── Style helpers ───────────────────────────────────────────
function btn(bg: string, color: string, small = false): React.CSSProperties {
  return { background: bg, color, border: 'none', borderRadius: '4px', padding: small ? '8px 14px' : '11px 18px', fontFamily: 'var(--font-mono)', fontWeight: 'bold', fontSize: small ? '12px' : '13px', letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap' as const };
}

const labelSt: React.CSSProperties = { fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: 'rgba(251,247,236,0.55)', textTransform: 'uppercase' };
