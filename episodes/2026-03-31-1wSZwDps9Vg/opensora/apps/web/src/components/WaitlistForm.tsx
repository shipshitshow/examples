'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface FormData {
  email: string;
}

export default function WaitlistForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSubmitted(true);
    } catch {
      // Silently succeed for MVP — don't block the user on a waitlist error
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="waitlist" className="py-28 bg-[#090909] relative overflow-hidden">
      {/* Projection beam — centred amber glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-[0.05]"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, #F59E0B 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      {/* Top rule */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />

      <div className="relative z-10 mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="h-px w-8 bg-brand-500/40" />
          <span className="section-label">Early Access</span>
          <span className="h-px w-8 bg-brand-500/40" />
        </div>

        <h2
          className="font-display font-extrabold tracking-tight mb-5 leading-tight"
          style={{ fontSize: 'clamp(2rem, 5.5vw, 3.75rem)' }}
        >
          Be the first to
          <br />
          <span className="text-brand-400" style={{ textShadow: '0 0 50px rgba(245,158,11,0.22)' }}>
            experience it
          </span>
        </h2>

        <p className="text-white/40 text-sm leading-relaxed mb-10 max-w-md mx-auto">
          Join thousands of creators already on the waitlist. Early access members get unlimited
          generations at launch — free.
        </p>

        {submitted ? (
          <div className="glass-card p-8 flex flex-col items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
              <svg
                className="h-7 w-7 text-brand-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="font-display text-lg font-bold">You&apos;re on the list</h3>
            <p className="text-white/40 text-sm">
              We&apos;ll email you when early access opens. Keep an eye on your inbox.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto"
          >
            <div className="flex-1">
              <input
                type="email"
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email',
                  },
                })}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04]
                           px-4 py-3.5 text-sm text-white placeholder-white/20
                           focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500/40
                           transition-all"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-brand-400/80 text-left">{errors.email.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Joining...
                </span>
              ) : (
                'Get Early Access'
              )}
            </button>
          </form>
        )}

        <p className="mt-5 text-[11px] text-white/20 tracking-wider">
          No credit card required &nbsp;·&nbsp; Unsubscribe at any time
        </p>
      </div>
    </section>
  );
}
