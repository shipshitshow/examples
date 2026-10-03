'use client';

import Link from 'next/link';

const TICKER_PROMPTS = [
  'A lone astronaut walking on Mars at golden hour',
  'Neon-lit Tokyo street in the rain, slow motion',
  'An ancient dragon over snow-covered peaks',
  'Underwater city, bioluminescent coral, 4K',
  'Time-lapse of a storm rolling over the Sahara',
  'A ballet dancer dissolving into fireflies',
  'Cyberpunk São Paulo from a drone at dusk',
  'Forest of giant crystal trees, cinematic',
];

const TICKER_TEXT = TICKER_PROMPTS.map((p) => `${p}  ·  `).join('');

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16">
      {/* Projection beam — warm cone of amber light from upper-left */}
      <div
        className="pointer-events-none absolute -top-40 -left-20 w-[900px] h-[900px] opacity-[0.07]"
        style={{
          background:
            'conic-gradient(from 10deg at 15% 0%, transparent 0deg, #F59E0B 18deg, #D97706 26deg, transparent 44deg)',
          filter: 'blur(60px)',
        }}
      />
      {/* Secondary fill glow */}
      <div
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[500px] opacity-[0.06]"
        style={{
          background: 'radial-gradient(ellipse, #F59E0B 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Cinema marquee ticker at the very top (below nav) */}
      <div className="absolute top-16 inset-x-0 overflow-hidden border-y border-white/[0.06] py-2.5">
        <div
          className="flex whitespace-nowrap animate-marquee"
          style={{ width: 'max-content' }}
          aria-hidden="true"
        >
          {/* Doubled for seamless loop */}
          <span className="text-[11px] tracking-[0.15em] text-white/25 font-display font-semibold uppercase">
            {TICKER_TEXT}
            {TICKER_TEXT}
          </span>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Section label */}
        <div className="inline-flex items-center gap-2.5 mb-8 animate-fade-in">
          <span className="h-px w-8 bg-brand-500/60" />
          <span className="section-label">The Sora Alternative</span>
          <span className="h-px w-8 bg-brand-500/60" />
        </div>

        {/* Headline — Syne, ultra-bold, oversized */}
        <h1
          className="font-display font-extrabold tracking-tight mb-6 animate-slide-up leading-[0.92]"
          style={{ fontSize: 'clamp(3rem, 9vw, 7rem)' }}
        >
          Turn any idea into
          <br />
          <span
            className="text-brand-400"
            style={{
              textShadow: '0 0 60px rgba(245,158,11,0.22)',
            }}
          >
            stunning video
          </span>
        </h1>

        <p
          className="text-white/50 max-w-xl mx-auto mb-10 animate-slide-up leading-relaxed"
          style={{ fontSize: 'clamp(0.95rem, 1.8vw, 1.15rem)', animationDelay: '80ms' }}
        >
          OpenSora turns text into cinematic AI video in seconds. No editing skills. No waiting
          weeks. Just prompts and pixels.
        </p>

        {/* CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row gap-3 justify-center mb-16 animate-slide-up"
          style={{ animationDelay: '160ms' }}
        >
          <Link href="#waitlist" className="btn-primary">
            Join the Waitlist — Free
          </Link>
          <Link href="#how-it-works" className="btn-secondary">
            See How It Works
          </Link>
        </div>

        {/* Cinema-style demo mockup */}
        <div
          className="glass-card overflow-hidden max-w-3xl mx-auto animate-fade-in"
          style={{ animationDelay: '240ms' }}
        >
          {/* "Now Showing" header bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07] bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-brand-500 animate-glow-pulse" />
              <span className="text-[10px] tracking-[0.25em] uppercase font-display font-semibold text-brand-400/80">
                Now Generating
              </span>
            </div>
            <span className="text-[10px] text-white/20 font-mono tracking-wider">opensora.xyz</span>
          </div>

          {/* Prompt input row */}
          <div className="px-5 pt-4 pb-3">
            <div className="flex items-center gap-3 bg-black/30 rounded-lg border border-white/[0.07] px-4 py-3">
              <svg
                className="h-4 w-4 text-brand-500/70 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm text-white/60 font-mono truncate">
                A lone astronaut walking on Mars at golden hour, cinematic
              </span>
              <div className="ml-auto shrink-0 bg-brand-500 rounded-md px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase text-white">
                Generate
              </div>
            </div>
          </div>

          {/* Video placeholder */}
          <div className="mx-5 mb-5 aspect-video rounded-lg overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a00] via-[#0d0d0d] to-[#0a0a14]" />
            {/* Atmospheric glow */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  'radial-gradient(ellipse at 30% 40%, rgba(245,158,11,0.22) 0%, transparent 60%)',
              }}
            />
            {/* Play button */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
              <div className="h-14 w-14 rounded-full border border-brand-500/40 bg-brand-500/10 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-brand-400 ml-0.5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-xs text-white/30 tracking-widest uppercase">
                Rendering frame 12 / 48
              </span>
              {/* Progress bars */}
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-0.5 w-6 rounded-full bg-brand-500/40 animate-pulse-slow"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            </div>
            {/* Film perf decoration — left edge */}
            <div className="absolute left-0 top-0 bottom-0 w-4 flex flex-col justify-around items-center py-2 opacity-20">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-3 w-2 rounded-sm border border-white/40 bg-transparent" />
              ))}
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-4 flex flex-col justify-around items-center py-2 opacity-20">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-3 w-2 rounded-sm border border-white/40 bg-transparent" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
