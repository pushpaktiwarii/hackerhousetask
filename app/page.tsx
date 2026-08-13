'use client';

import React, { useState } from 'react';

export default function LandingPage() {
  const [isBoarding, setIsBoarding] = useState(false);

  // Play a quick retro boarding stamp sound on click
  const playStampSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();

      // Synthesize a heavy stamp thud
      const osc = audioCtx.createOscillator();
      const oscGain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.15);
      
      oscGain.gain.setValueAtTime(0.8, audioCtx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      
      osc.connect(oscGain);
      oscGain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBoard = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    playStampSound();
    setIsBoarding(true);
    // Vibrate device if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    setTimeout(() => {
      window.location.href = '/generate';
    }, 450);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 50%, #154f3b 0%, #061f16 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      position: 'relative',
      overflow: 'hidden',
      color: '#FBF7EC',
    }}>
      {/* Background visual dots */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.05,
        backgroundImage: 'radial-gradient(#FBF7EC 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        pointerEvents: 'none',
      }} />

      {/* Main Container */}
      <div style={{
        maxWidth: '960px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '40px',
        zIndex: 10,
        transform: isBoarding ? 'scale(0.98) translateY(10px)' : 'none',
        opacity: isBoarding ? 0 : 1,
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>

        {/* Vintage Header */}
        <header style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'rgba(251, 247, 236, 0.06)',
            border: '1px solid rgba(251, 247, 236, 0.15)',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--yellow)',
          }}>
            🌴 Hacker House Goa 2026 🌴
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(32px, 6vw, 68px)',
            lineHeight: 1.1,
            margin: '8px 0 0 0',
            letterSpacing: '-0.02em',
            color: 'var(--cream)',
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          }}>
            Postcard From Goa
          </h1>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'clamp(12px, 2.5vw, 15px)',
            color: 'rgba(251, 247, 236, 0.65)',
            maxWidth: '540px',
            margin: '8px auto 0 auto',
            lineHeight: 1.5,
          }}>
            Enter the portal to stamp your passport, personalize your vintage postcard, and share your builder identity with the world.
          </p>
        </header>

        {/* Vintage Ticket / Boarding Pass */}
        <div style={{
          background: '#FBF7EC',
          color: '#161310',
          borderRadius: '16px',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6)',
          width: '100%',
          maxWidth: '720px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(22, 19, 16, 0.15)',
          position: 'relative',
        }}>
          {/* Top colored strip */}
          <div style={{ height: '8px', background: '#EC1E79' }} />

          {/* Ticket Body */}
          <div style={{
            padding: '24px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '24px',
            position: 'relative',
          }}>
            {/* Ticket Left Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minWidth: '240px' }}>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#888', textTransform: 'uppercase' }}>Departure</div>
                  <div style={{ fontSize: '22px', fontFamily: 'var(--font-serif)', fontWeight: 'bold' }}>LOCALHOST</div>
                </div>
                <div style={{ fontSize: '18px', color: '#EC1E79' }}>✈</div>
                <div>
                  <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#888', textTransform: 'uppercase' }}>Destination</div>
                  <div style={{ fontSize: '22px', fontFamily: 'var(--font-serif)', fontWeight: 'bold' }}>GOA (HH26)</div>
                </div>
              </div>

              {/* Ticket Details Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                gap: '16px',
                borderTop: '1px dashed rgba(22, 19, 16, 0.15)',
                paddingTop: '16px',
              }}>
                <div>
                  <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: '#888' }}>FLIGHT</div>
                  <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>HH-GOA-2026</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: '#888' }}>DATE</div>
                  <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>OCT 28, 2026</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: '#888' }}>GATE</div>
                  <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>BUILDER PORTAL</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: '#888' }}>CLASS</div>
                  <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: '#0E7C74' }}>FIRST CLASS</div>
                </div>
              </div>
            </div>

            {/* Ticket Right / Perforated Stub Section */}
            <div style={{
              borderLeft: '2px dashed rgba(22, 19, 16, 0.15)',
              paddingLeft: '32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '150px',
              gap: '16px',
              position: 'relative',
            }}>
              {/* Retro Goa stamp graphic */}
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: '3px double #0E7C74',
                color: '#0E7C74',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transform: 'rotate(-12deg)',
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                fontWeight: 'bold',
                lineHeight: 1.2,
                textAlign: 'center',
                boxShadow: '0 0 0 3px #FBF7EC, 0 0 0 4px #0E7C74',
                userSelect: 'none',
              }}>
                <div>ARRIVED</div>
                <div style={{ fontSize: '11px', borderTop: '1px solid #0E7C74', borderBottom: '1px solid #0E7C74', margin: '2px 0', padding: '0 4px' }}>GOA</div>
                <div style={{ fontSize: '7px' }}>28.10.2026</div>
              </div>

              {/* Barcode representation */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  height: '24px',
                  width: '110px',
                  background: 'repeating-linear-gradient(90deg, #161310, #161310 2px, transparent 2px, transparent 6px)',
                }} />
                <div style={{ fontSize: '8px', fontFamily: 'var(--font-mono)', color: '#888' }}>PASS-NO. 28312026</div>
              </div>
            </div>
          </div>

          {/* Ticket Footer / Boarding Action */}
          <div style={{
            background: '#F5EEDC',
            borderTop: '1px solid rgba(22, 19, 16, 0.1)',
            padding: '16px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#666' }}>
              ⚠️ STAMP PORTAL ENTRANCE PERMIT REQUIRED
            </span>
            <button 
              onClick={handleBoard}
              className="btn-slam-premium"
              style={{
                width: 'auto',
                padding: '12px 28px',
                background: '#EC1E79',
                boxShadow: '0 4px 15px rgba(236, 30, 121, 0.35)',
              }}
            >
              🎟️ Board & Claim Stamp
            </button>
          </div>
        </div>

        {/* Polaroid Cards Vibe Gallery */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', alignItems: 'center' }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '18px',
            color: 'var(--yellow)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            textAlign: 'center',
            margin: 0,
          }}>
            🌴 Pick your Vibe, Make your Postcard
          </h2>

          <div className="polaroid-row">
            {/* Vibe 1: Scooter */}
            <div className="polaroid-card card-rotate-left">
              <div className="polaroid-img-wrapper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/bg-scooter.png" alt="Scooter" />
              </div>
              <div className="polaroid-caption">Scooter Ride 🛵</div>
            </div>

            {/* Vibe 2: House */}
            <div className="polaroid-card card-rotate-right">
              <div className="polaroid-img-wrapper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/bg-house.png" alt="Portuguese House" />
              </div>
              <div className="polaroid-caption">Old Portuguese Vibe 🏡</div>
            </div>

            {/* Vibe 3: Beach */}
            <div className="polaroid-card card-rotate-left-2">
              <div className="polaroid-img-wrapper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/bg-beach.png" alt="Beach Vibe" />
              </div>
              <div className="polaroid-caption">Goa Beaches 🏝️</div>
            </div>

            {/* Vibe 4: Palms */}
            <div className="polaroid-card card-rotate-right-2">
              <div className="polaroid-img-wrapper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/bg-palms.png" alt="Palm Grove" />
              </div>
              <div className="polaroid-caption">Palm Breezes 🌴</div>
            </div>
          </div>
        </div>

      </div>

      {/* Screen flash on boarding stamp */}
      {isBoarding && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: '#FBF7EC',
          zIndex: 100,
          animation: 'flash 0.3s ease-out forwards',
        }} />
      )}

      {/* Landing page style overrides */}
      <style>{`
        .btn-slam-premium {
          background: #EC1E79;
          color: #fff;
          border: 1px solid rgba(251, 247, 236, 0.2);
          border-radius: 8px;
          font-family: var(--font-mono);
          font-weight: bold;
          font-size: 14px;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
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

        .polaroid-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          margin-top: 10px;
          width: 100%;
        }

        .polaroid-card {
          background: #FBF7EC;
          padding: 12px 12px 20px 12px;
          box-shadow: 0 15px 30px rgba(0,0,0,0.3);
          border-radius: 4px;
          width: 160px;
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .polaroid-card:hover {
          transform: scale(1.1) rotate(0deg) translateY(-10px) !important;
          box-shadow: 0 25px 45px rgba(0,0,0,0.5);
          z-index: 20;
        }

        .polaroid-img-wrapper {
          width: 100%;
          height: 120px;
          overflow: hidden;
          background: #e4dcc7;
          border: 1px solid rgba(22,19,16,0.1);
          border-radius: 2px;
        }

        .polaroid-img-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .polaroid-caption {
          color: #161310;
          font-family: var(--font-serif);
          font-size: 11px;
          margin-top: 12px;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }

        .card-rotate-left { transform: rotate(-5deg); }
        .card-rotate-right { transform: rotate(3deg); }
        .card-rotate-left-2 { transform: rotate(-3deg); }
        .card-rotate-right-2 { transform: rotate(6deg); }

        @keyframes flash {
          0% { opacity: 0; }
          40% { opacity: 1; }
          100% { opacity: 0.95; }
        }
      `}</style>
    </div>
  );
}
