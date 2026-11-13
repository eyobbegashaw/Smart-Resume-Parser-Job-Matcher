import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight,
  Award,
  Briefcase,
  CheckCircle2,
  FileSearch,
  Globe2,
  Layers,
  MapPin,
  ShieldCheck,
  Sparkles,
  Target,
  UploadCloud,
  Cpu,
  Compass,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

gsap.registerPlugin(ScrollTrigger);

const FEATURE_ICONS = [FileSearch, Award, Target, TrendingUp, Globe2, ShieldCheck];
const STEP_ICONS = [UploadCloud, Sparkles, Award, Compass];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { language, t } = useLanguage();
  const rootRef = useRef(null);
  const progressBarRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !rootRef.current) return;

    const ctx = gsap.context(() => {
      // Hero entrance timeline
      gsap.from('.hero-stagger', {
        y: 28,
        opacity: 0,
        duration: 0.75,
        stagger: 0.1,
        ease: 'power3.out'
      });

      gsap.from('.hero-preview-card', {
        y: 36,
        scale: 0.96,
        opacity: 0,
        duration: 0.9,
        delay: 0.25,
        ease: 'power3.out'
      });

      gsap.to('.hero-float-badge', {
        y: -8,
        duration: 2.6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      // ScrollTrigger pipeline progress bar + step tracking
      if (progressBarRef.current) {
        gsap.fromTo(
          progressBarRef.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            transformOrigin: 'top center',
            scrollTrigger: {
              trigger: '.pipeline-section',
              start: 'top 60%',
              end: 'bottom 65%',
              scrub: true
            }
          }
        );
      }

      gsap.utils.toArray('.pipeline-step-card').forEach((card, index) => {
        gsap.from(card, {
          y: 32,
          opacity: 0,
          duration: 0.65,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 82%',
            once: true
          }
        });

        ScrollTrigger.create({
          trigger: card,
          start: 'top 55%',
          end: 'bottom 45%',
          onEnter: () => setActiveStep(index),
          onEnterBack: () => setActiveStep(index)
        });
      });

      // Feature bento grid stagger reveal
      gsap.from('.feature-bento-card', {
        y: 34,
        opacity: 0,
        duration: 0.65,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.features-grid',
          start: 'top 82%',
          once: true
        }
      });

      // CTA banner reveal
      gsap.from('.final-cta-card', {
        y: 28,
        scale: 0.98,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.final-cta-card',
          start: 'top 85%',
          once: true
        }
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(rafId);
  }, [language]);

  const pipelineSteps = t('landing.pipelineSteps');
  const features = t('landing.features');
  const previewSkills = t('landing.previewCard.topSkills');

  return (
    <div ref={rootRef} className="overflow-x-clip">
      {/* Hero Section */}
      <section className="hero-mesh bg-grid-slate relative border-b border-slate-200/70 dark:border-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            {/* Hero Copy */}
            <div className="lg:col-span-7">
              <div className="hero-stagger inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/90 px-3.5 py-1.5 text-xs font-bold text-brand-700 dark:border-brand-800/80 dark:bg-brand-950/70 dark:text-brand-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{t('landing.badge')}</span>
              </div>

              <h1 className="hero-stagger mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem] lg:leading-[1.1] dark:text-white">
                {t('landing.heroTitlePrefix')}{' '}
                <span className="bg-gradient-to-r from-brand-600 via-emerald-500 to-gold-500 bg-clip-text text-transparent dark:from-brand-400 dark:via-emerald-300 dark:to-gold-400">
                  {t('landing.heroTitleHighlight')}
                </span>
              </h1>

              <p className="hero-stagger mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
                {t('landing.heroSubtitle')}
              </p>

              <div className="hero-stagger mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  to={isAuthenticated ? '/resumes' : '/register'}
                  className="btn-primary px-6 py-3 text-sm sm:text-base"
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>{t('landing.ctaUpload')}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Enterprise Product Snapshot Mockup */}
            <div className="hero-preview-card relative lg:col-span-5">
              <div className="glass-card relative rounded-3xl p-6">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('landing.previewCard.header')}
                    </span>
                  </div>
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    AI
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {t('landing.previewCard.candidate')}
                    </h2>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin className="h-3.5 w-3.5 text-brand-500" />
                      {t('landing.previewCard.location')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {t('landing.previewCard.scoreValue')}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {t('landing.previewCard.scoreLabel')}
                    </span>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 dark:border-emerald-900/70 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{t('landing.previewCard.matchedRole')}</span>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(previewSkills) &&
                      previewSkills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
                        >
                          {skill}
                        </span>
                      ))}
                  </div>
                </div>

                <p className="mt-5 rounded-xl bg-slate-100/90 p-3 text-xs leading-relaxed text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                  {t('landing.previewCard.insight')}
                </p>
              </div>

              <div className="hero-float-badge absolute -bottom-4 -left-4 hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 shadow-lg sm:inline-flex dark:border-slate-700 dark:bg-slate-900">
                <Globe2 className="h-4 w-4 text-brand-500" />
                <span className="font-ethiopic text-xs font-bold text-slate-800 dark:text-slate-100">
                  EN ↔ አማርኛ Ready
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ScrollTrigger 4-Stage Pipeline */}
      <section className="pipeline-section mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <span className="text-xs font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                {t('landing.pipelineEyebrow')}
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                {t('landing.pipelineTitle')}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
                {t('landing.pipelineSubtitle')}
              </p>

              {/* Dynamic progress indicator synced with GSAP ScrollTrigger */}
              <div className="mt-8 hidden items-stretch gap-4 lg:flex">
                <div className="relative w-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    ref={progressBarRef}
                    className="h-full w-full rounded-full bg-gradient-to-b from-brand-500 to-gold-500"
                  />
                </div>
                <div className="space-y-3 py-1">
                  {Array.isArray(pipelineSteps) &&
                    pipelineSteps.map((s, idx) => (
                      <div
                        key={s.step}
                        className={`flex items-center gap-2.5 text-sm font-semibold transition-colors ${
                          activeStep === idx
                            ? 'text-brand-600 dark:text-brand-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        <span className="font-mono text-xs">{s.step}</span>
                        <span>{s.title}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-7">
            {Array.isArray(pipelineSteps) &&
              pipelineSteps.map((step, idx) => {
                const Icon = STEP_ICONS[idx % STEP_ICONS.length];
                const isActive = activeStep === idx;
                return (
                  <div
                    key={step.step}
                    className={`pipeline-step-card surface-card rounded-3xl p-6 sm:p-8 transition-colors duration-300 ${
                      isActive
                        ? 'border-brand-300 ring-1 ring-brand-500/20 dark:border-brand-700/80'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/70 dark:text-brand-400">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                          {t('landing.stepBadge', { step: step.step })}
                        </span>
                        <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                          {step.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      {/* Enterprise Features Bento */}
      <section className="border-y border-slate-200/80 bg-slate-100/60 py-20 dark:border-slate-800/80 dark:bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-xs font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-400">
              {t('landing.featuresEyebrow')}
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              {t('landing.featuresTitle')}
            </h2>
          </div>

          <div className="features-grid mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.isArray(features) &&
              features.map((feat, idx) => {
                const Icon = FEATURE_ICONS[idx % FEATURE_ICONS.length];
                return (
                  <div
                    key={feat.title}
                    className="feature-bento-card surface-card rounded-3xl p-6 transition-shadow hover:shadow-lg"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/15 to-gold-500/15 text-brand-600 dark:text-brand-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                      {feat.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {feat.desc}
                    </p>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      {/* AI Intelligence & Daily Quota Showcase */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            {language === 'am' ? 'የዕለቱ የAI ትንተና ማዕከል' : 'INTELLIGENT RESUME LAB'}
          </span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {language === 'am'
              ? 'የሲቪ ትንተና፣ የሙያ ግምቶች እና በቀን 5 ነፃ የAI ፍተሻዎች'
              : 'PDF Intelligence, Career Diagnostics & 5 Daily Scans'}
          </h2>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="surface-card rounded-3xl p-6 transition-all hover:border-brand-300">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
              <FileSearch className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              {language === 'am' ? 'የተሟላ የሲቪ መረጃ ማውጫ' : 'Structured PDF Extraction'}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {language === 'am'
                ? 'የስራ ልምድ፣ የትምህርት ታሪክ፣ ቴክኒካል እና ማህበራዊ ክህሎቶችን እንዲሁም ማጠቃለያዎችን በከፍተኛ ጥራት ያወጣል።'
                : 'Extracts verified career timelines, academic credentials, hard & soft skills, and executive summaries with zero hallucination.'}
            </p>
          </div>

          <div className="surface-card rounded-3xl p-6 transition-all hover:border-brand-300">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <Compass className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              {language === 'am' ? 'የሙያ አቅጣጫ እና ግምቶች' : 'AI Career Diagnostics ("Guess Works")'}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {language === 'am'
                ? 'ከተገኙት ክህሎቶችዎ በመነሳት ተስማሚ የሥራ መደቦችን፣ የሙያ ደረጃን እና የሚመከሩ ክህሎቶችን ይገምታል።'
                : 'Infers high-probability role matches, seniority horizon, and recommended next-level skills to maximize market value.'}
            </p>
          </div>

          <div className="surface-card rounded-3xl p-6 transition-all hover:border-brand-300">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              {language === 'am' ? 'በቀን 5 ነፃ የAI ፍተሻዎች' : '5 Free Daily AI Scans Allowance'}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {language === 'am'
                ? 'እያንዳንዱ ተጠቃሚ በቀን 5 ነፃ የAI ትንተናዎችን ያገኛል። ተጨማሪ ትንተና በየቀኑ በ00:00 UTC ይታደሳል።'
                : 'Every account gets 5 deep AI resume audits per calendar day, with your daily AI limit resetting at midnight UTC.'}
            </p>
          </div>
        </div>
      </section>

      {/* Final Enterprise CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="final-cta-card relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-12 text-white shadow-2xl sm:px-12 sm:py-16 dark:border dark:border-slate-800 dark:bg-slate-900">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-gold-500/15 blur-3xl" />

          <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {t('landing.finalCtaTitle')}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                {t('landing.finalCtaSubtitle')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to={isAuthenticated ? '/resumes' : '/register'}
                className="btn-primary bg-brand-500 px-6 py-3 hover:bg-brand-400"
              >
                <span>{t('landing.finalCtaPrimary')}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800/70 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  {t('landing.finalCtaSecondary')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
