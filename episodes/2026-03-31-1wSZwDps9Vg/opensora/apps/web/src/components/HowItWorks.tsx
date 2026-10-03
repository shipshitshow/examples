const steps = [
  {
    number: '01',
    title: 'Write your prompt',
    description:
      'Describe your video in plain English. Be as brief or detailed as you like — our model understands intent.',
  },
  {
    number: '02',
    title: 'AI generates your video',
    description:
      'State-of-the-art rendering, frame by frame. Watch progress in real time as your idea comes to life.',
  },
  {
    number: '03',
    title: 'Preview & share',
    description:
      'Download in 4K or share to your favourite platforms in one tap. Your audience is waiting.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 bg-[#0d0d0d] relative overflow-hidden">
      {/* Thin amber horizontal rule at top */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-5">
            <span className="section-label">Process</span>
            <span className="h-px flex-1 bg-white/[0.06] max-w-[60px]" />
          </div>
          <h2
            className="font-display font-extrabold tracking-tight leading-tight"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
          >
            Three steps to your
            <br />
            <span
              className="text-brand-400"
              style={{ textShadow: '0 0 40px rgba(245,158,11,0.22)' }}
            >
              next viral video
            </span>
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.05]">
          {steps.map((step, i) => (
            <div key={i} className="relative px-0 lg:px-10 py-10 lg:py-0 first:pl-0 last:pr-0">
              {/* Giant hollow step number as background decoration */}
              <div
                className="font-display font-extrabold leading-none select-none pointer-events-none mb-2"
                style={{
                  fontSize: 'clamp(5rem, 12vw, 9rem)',
                  WebkitTextStroke: '1px rgba(245, 158, 11, 0.15)',
                  color: 'transparent',
                  lineHeight: 0.85,
                }}
              >
                {step.number}
              </div>

              {/* Amber dot connector (desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-[4.5rem] right-0 w-px h-px">
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-500/40 translate-x-0.5 -translate-y-0.5" />
                </div>
              )}

              <h3 className="font-display text-lg font-bold mb-3 text-white/90">{step.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed max-w-xs">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Thin amber horizontal rule at bottom */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />
    </section>
  );
}
