const features = [
  {
    num: '01',
    title: 'Instant Generation',
    description:
      'Go from prompt to polished video in under 30 seconds. Our optimised inference pipeline is 10× faster than competitors.',
  },
  {
    num: '02',
    title: 'Cinematic Quality',
    description:
      '4K resolution, smooth motion, photorealistic detail. Every frame is crafted to look like it belongs in a blockbuster.',
  },
  {
    num: '03',
    title: 'Mobile-First',
    description:
      'Create and share directly from your phone. Native iOS and Android apps make AI video creation available anywhere.',
  },
  {
    num: '04',
    title: 'One-Tap Share',
    description:
      'Export to TikTok, Instagram Reels, YouTube Shorts, or X in one tap. Perfectly sized for every platform.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-28 bg-[#090909] relative overflow-hidden">
      {/* Subtle ambient glow */}
      <div
        className="pointer-events-none absolute -right-40 top-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle, #F59E0B 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-5">
            <span className="section-label">Platform</span>
            <span className="h-px flex-1 bg-white/[0.06] max-w-[60px]" />
          </div>
          <h2
            className="font-display font-extrabold tracking-tight leading-tight"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
          >
            Everything you need
            <br />
            to go{' '}
            <span
              className="text-brand-400"
              style={{ textShadow: '0 0 40px rgba(245,158,11,0.22)' }}
            >
              viral
            </span>
          </h2>
        </div>

        {/* Feature grid — each card has a massive hollow numeral */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.05]">
          {features.map((feature) => (
            <div
              key={feature.num}
              className="relative bg-[#090909] p-8 sm:p-10 overflow-hidden group hover:bg-white/[0.02] transition-colors duration-300"
            >
              {/* Oversized hollow numeral */}
              <div
                className="absolute -top-6 -right-4 font-display font-extrabold text-[120px] leading-none select-none pointer-events-none transition-opacity duration-300 group-hover:opacity-100 opacity-[0.04]"
                style={{
                  WebkitTextStroke: '1px #FBBF24',
                  color: 'transparent',
                }}
              >
                {feature.num}
              </div>

              {/* Hover accent line */}
              <div className="absolute bottom-0 left-0 h-px w-0 bg-gradient-to-r from-brand-500 to-transparent group-hover:w-full transition-all duration-500" />

              <div className="relative z-10">
                <span className="section-label mb-4 block">{feature.num}</span>
                <h3 className="font-display text-xl font-bold mb-3 text-white/90">
                  {feature.title}
                </h3>
                <p className="text-white/40 text-sm leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
