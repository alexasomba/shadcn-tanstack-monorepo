"use client";
import { Play, CaretDown } from "@phosphor-icons/react";
import LogoIcon from "@workspace/ui/components/ui/widgets/logo-icon";
import { motion, useMotionValue, useMotionTemplate } from "motion/react";
import React from "react";

interface NavLink {
  label: string;
  href: string;
  hasDropdown?: boolean;
}

interface Hero4Props {
  brandName?: string;
  navLinks?: NavLink[];
  loginLabel?: string;
  loginHref?: string;
  /** Small pill badge text above the heading */
  badgeText?: string;
  headingLine1?: string;
  headingLine2?: string;
  description?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  /** Bottom-right achievement text */
  achievementText?: string;
  backgroundImage?: string;
}

export default function Hero4({
  brandName = "Watermelon",
  navLinks = [
    { label: "Solution", href: "#", hasDropdown: true },
    { label: "Pricing", href: "#", hasDropdown: true },
    { label: "About", href: "#" },
    { label: "Resources", href: "#" },
    { label: "Integration", href: "#" },
  ],
  loginLabel = "Log in",
  loginHref = "#",
  badgeText = "✦  Trusted by industry leaders",
  headingLine1 = "Where Innovation",
  headingLine2 = "Meets Impact.",
  description = "Watermelon empowers teams to build, scale, and transform with technology that drives real results.",
  primaryCtaLabel = "Get Started",
  primaryCtaHref = "#",
  secondaryCtaLabel = "Watch Demo",
  secondaryCtaHref = "#",
  achievementText = "We've completed over 100+ landmark projects",
  backgroundImage = "https://assets.watermelon.sh/hero-5.avif",
}: Hero4Props) {
  const line1Words = headingLine1.split(" ");
  const line2Words = headingLine2.split(" ");

  // Mouse tracking for subtle spotlight elevation
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <section
      className="group relative h-screen min-h-[700px] w-full overflow-hidden bg-[#0d0b0f]"
      onMouseMove={handleMouseMove}
    >
      {/* Background Image — cinematic zoom in */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.12, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2.6, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <img
          src={backgroundImage}
          alt="Hero background"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </motion.div>

      {/* Layered gradient overlays */}
      <div className="absolute inset-0 bg-linear-to-t from-[#0d0b0f]/80 via-transparent to-[#0d0b0f]/40" />
      <div className="absolute inset-0 bg-linear-to-r from-[#0d0b0f]/60 via-transparent to-transparent" />

      {/* Noise texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      {/* Mouse-tracking spotlight for minimal elevation */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
                        radial-gradient(
                            600px circle at ${mouseX}px ${mouseY}px,
                            rgba(255, 255, 255, 0.05),
                            transparent 80%
                        )
                    `,
        }}
      />

      {/* Content Layer */}
      <div className="relative z-10 flex h-full w-full flex-col">
        {/* ─── Navbar ─── */}
        <motion.nav
          className="flex w-full items-center justify-between px-6 py-5 md:px-10 md:py-7 lg:px-16"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
        >
          {/* Logo */}
          <a href="/" className="group/logo flex shrink-0 items-center gap-2.5">
            <LogoIcon className="size-8 text-white" />
            <span className="text-lg font-semibold tracking-tight text-white transition-all duration-300">
              {brandName}
            </span>
          </a>

          {/* Center Nav Links */}
          <div className="hidden items-center gap-7 lg:flex xl:gap-9">
            {navLinks.map((link, idx) => (
              <motion.a
                key={idx}
                href={link.href}
                className="group/nav relative flex items-center gap-1 text-[14px] font-medium text-white/75 transition-colors duration-200 hover:text-white"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 + idx * 0.07 }}
              >
                {link.label}
                {link.hasDropdown && (
                  <CaretDown
                    size={14}
                    strokeWidth={2}
                    className="text-white/50 transition-colors group-hover/nav:text-white/80"
                  />
                )}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-white/60 transition-all duration-300 group-hover/nav:w-full" />
              </motion.a>
            ))}
          </div>

          {/* Right Side — Log in */}
          <div className="flex items-center gap-5">
            <motion.a
              href={loginHref}
              className="group flex items-center gap-2.5 text-[14px] font-medium text-white/85 transition-colors hover:text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              {/* Orange status dot */}
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
              </span>
              {loginLabel}
            </motion.a>

            {/* Mobile Menu Button */}
            <button className="p-1 text-white lg:hidden">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="12" x2="16" y2="12" />
                <line x1="3" y1="17" x2="21" y2="17" />
              </svg>
            </button>
          </div>
        </motion.nav>

        {/* ─── Hero Content ─── */}
        <div className="flex flex-1 flex-col justify-end px-6 pb-20 md:px-10 md:pb-28 lg:px-16">
          <div className="max-w-2xl">
            {/* Badge pill */}
            <motion.div
              className="mb-8 inline-flex items-center md:mb-10"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
            >
              <span className="relative inline-flex items-center overflow-hidden rounded-full border border-white/15 bg-white/4 px-4 py-1.5 text-[12px] font-medium text-white/85 backdrop-blur-sm md:text-[13px]">
                <span className="absolute inset-0 -translate-x-full animate-[shimmer_3.5s_infinite] bg-linear-to-r from-transparent via-white/[0.07] to-transparent" />
                <span className="relative">{badgeText}</span>
              </span>
            </motion.div>

            {/* Heading — word-by-word stagger */}
            <h1 className="mb-6 text-[42px] leading-[1.05] font-light tracking-tight text-white sm:text-[54px] md:mb-8 md:text-[64px] lg:text-[72px]">
              <span className="block overflow-hidden">
                {line1Words.map((word, i) => (
                  <motion.span
                    key={i}
                    className="mr-[0.3em] inline-block"
                    initial={{ y: "120%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      duration: 0.85,
                      delay: 0.65 + i * 0.1,
                      ease: [0.33, 1, 0.68, 1],
                    }}
                  >
                    {word}
                  </motion.span>
                ))}
              </span>
              <span className="block overflow-hidden">
                {line2Words.map((word, i) => (
                  <motion.span
                    key={i}
                    className="mr-[0.3em] inline-block"
                    initial={{ y: "120%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      duration: 0.85,
                      delay: 0.95 + i * 0.1,
                      ease: [0.33, 1, 0.68, 1],
                    }}
                  >
                    {word}
                  </motion.span>
                ))}
              </span>
            </h1>

            {/* Animated horizontal rule */}
            <motion.div
              className="mb-6 h-px max-w-sm bg-linear-to-r from-white/40 via-white/15 to-transparent md:mb-7"
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.2, delay: 1.25, ease: [0.33, 1, 0.68, 1] }}
            />

            {/* Description */}
            <motion.p
              className="mb-10 max-w-md text-sm leading-relaxed text-white/55 md:mb-12 md:text-[15px]"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 1.35, ease: "easeOut" }}
            >
              {description}
            </motion.p>

            {/* CTA Buttons */}
            <div className="flex items-center gap-4 md:gap-5">
              {/* Primary — white filled pill */}
              <motion.a
                href={primaryCtaHref}
                className="group/btn relative overflow-hidden rounded-full bg-white px-7 py-3 text-[14px] font-semibold text-[#0d0b0f]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1.55 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                {/* Hover sweep — dark fills from bottom */}
                <span className="absolute inset-0 translate-y-full rounded-full bg-[#0d0b0f] transition-transform duration-300 ease-out group-hover/btn:translate-y-0" />
                <span className="relative z-10 transition-colors duration-300 group-hover/btn:text-white">
                  {primaryCtaLabel}
                </span>
              </motion.a>

              {/* Secondary — semi-transparent dark pill with play icon */}
              <motion.a
                href={secondaryCtaHref}
                className="group flex items-center gap-2.5 rounded-full border border-white/10 bg-white/8 px-6 py-3 text-[14px] font-medium text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.14]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1.7 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {secondaryCtaLabel}
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-colors group-hover:bg-white/25">
                  <Play size={10} fill="white" strokeWidth={0} className="ml-px" />
                </span>
              </motion.a>
            </div>
          </div>
        </div>

        {/* ─── Bottom Bar ─── */}
        <div className="flex w-full items-end justify-between px-6 pb-8 md:px-10 md:pb-10 lg:px-16">
          {/* Spacer for left */}
          <div />

          {/* Achievement text with elevated avatar stack — bottom right */}
          <motion.div
            className="flex items-center gap-3 md:gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 2 }}
          >
            <div className="flex -space-x-2">
              {["wm_alex.png", "wm_olivia.png", "wm_mia.png"].map((i) => (
                <div
                  key={i}
                  className="relative h-7 w-7 overflow-hidden rounded-full border-2 border-[#0d0b0f] bg-white/5 backdrop-blur-md md:h-8 md:w-8"
                >
                  <img
                    src={`https://assets.watermelon.sh/${i}`}
                    alt="User avatar"
                    className="absolute inset-0 h-full w-full object-cover opacity-80"
                  />
                </div>
              ))}
            </div>
            <p className="text-[13px] font-medium tracking-wide text-white/45 md:text-[14px]">
              {achievementText}
            </p>
          </motion.div>
        </div>
      </div>

      {/* ─── Decorative Corner Frame Lines ─── */}
      <motion.div
        className="pointer-events-none absolute top-6 right-6 hidden h-12 w-12 md:top-8 md:right-10 md:block lg:right-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.4 }}
      >
        <span className="absolute top-0 right-0 h-px w-full bg-linear-to-l from-white/20 to-transparent" />
        <span className="absolute top-0 right-0 h-full w-px bg-linear-to-b from-white/20 to-transparent" />
      </motion.div>

      <motion.div
        className="pointer-events-none absolute bottom-6 left-6 hidden h-12 w-12 md:bottom-8 md:left-10 md:block lg:left-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.4 }}
      >
        <span className="absolute bottom-0 left-0 h-px w-full bg-linear-to-r from-white/20 to-transparent" />
        <span className="absolute bottom-0 left-0 h-full w-px bg-linear-to-t from-white/20 to-transparent" />
      </motion.div>

      {/* CSS keyframes */}
      <style>{`
                @keyframes shimmer {
                    to { transform: translateX(200%); }
                }
            `}</style>
    </section>
  );
}
