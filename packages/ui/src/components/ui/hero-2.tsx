"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { ArrowRight, ArrowDown, Play, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { Variants } from "motion/react";
import React, { useState } from "react";

export interface NavLink {
  label: string;
  href: string;
  active?: boolean;
  hasDropdown?: boolean;
  dropdownItems?: { label: string; href: string }[];
}

export interface SocialLink {
  label: string;
  href: string;
}

export interface Hero2Props {
  brand?: React.ReactNode;
  navLinks?: NavLink[];
  headline?: React.ReactNode;
  description?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  socialLinks?: SocialLink[];
  signInLabel?: string;
  signInHref?: string;
  className?: string;
}

const DEFAULT_NAV: NavLink[] = [
  { label: "Home", href: "#", active: true },
  { label: "Pricing", href: "#" },
  { label: "About", href: "#" },
  { label: "FAQs", href: "#" },
];

const DEFAULT_SOCIAL: SocialLink[] = [
  { label: "Linkedin", href: "#" },
  { label: "Instagram", href: "#" },
  { label: "Behance", href: "#" },
];

export function Hero2({
  brand = "Watermelon",
  navLinks = DEFAULT_NAV,
  headline = (
    <>
      Automate Smarter,
      <br />
      Work{" "}
      <span className="font-serif font-medium text-[oklch(0.6378_0.1051_172.72)] italic">
        Faster.
      </span>
    </>
  ),
  description = "Say goodbye to repetitive tasks. Our AI-driven platform streamlines\nyour workflows so your team can focus on what really matters.",
  primaryCtaLabel = "See It In Action",
  secondaryCtaLabel = "Book a demo",
  socialLinks = DEFAULT_SOCIAL,
  signInLabel = "Sign in",
  className,
}: Hero2Props) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [activeLink, setActiveLink] = useState<string | null>(
    navLinks.find((link) => link.active)?.label || navLinks[0]?.label || null,
  );

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  };

  return (
    <section
      className={cn(
        "relative flex min-h-screen w-full flex-col justify-between overflow-hidden bg-slate-50 selection:bg-emerald-100 selection:text-emerald-900",
        className,
      )}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={"https://assets.watermelon.sh/hero-2.avif"}
          alt="Background"
          className="absolute inset-0 h-full w-full object-cover object-right opacity-100 md:object-center"
        />
      </div>

      {/* Header / Navbar */}
      <div className="relative z-50 mx-auto w-full max-w-[1440px]">
        <header className="flex items-center justify-between px-6 py-6 md:px-10 md:py-8 lg:px-16 xl:px-24">
          {/* Brand Logo */}
          <a href="/" className="group flex items-center gap-1">
            {typeof brand === "string" ? (
              <span className="relative text-xl font-bold tracking-tight text-slate-900 select-none">
                {brand}
                <span className="absolute top-1 -right-1.5 h-1 w-1 rounded-full bg-[oklch(0.6378_0.1051_172.72)]"></span>
              </span>
            ) : (
              brand
            )}
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:block">
            <ul
              className="flex items-center gap-10 lg:gap-14"
              onMouseLeave={() => setHoveredLink(null)}
            >
              {navLinks.map((link) => (
                <li
                  key={link.label}
                  className="group relative flex flex-col items-center py-2"
                  onMouseEnter={() => setHoveredLink(link.label)}
                >
                  <a
                    href={link.href}
                    onClick={(e) => {
                      if (link.href === "#") e.preventDefault();
                      setActiveLink(link.label);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 text-sm font-medium transition-colors",
                      hoveredLink === link.label || (!hoveredLink && activeLink === link.label)
                        ? "font-semibold text-slate-900"
                        : "text-slate-400",
                    )}
                  >
                    {link.label}
                    {link.hasDropdown && (
                      <ChevronDown className="h-3.5 w-3.5 stroke-[2.5] opacity-50 transition-transform duration-200 group-hover:rotate-180" />
                    )}
                  </a>
                  {/* Active/Hover Indicator Dot */}
                  {(hoveredLink === link.label || (!hoveredLink && activeLink === link.label)) && (
                    <motion.span
                      layoutId="activeDot"
                      className="absolute -bottom-1.5 h-1 w-1 rounded-full bg-[oklch(0.6378_0.1051_172.72)]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Desktop Sign in button */}
          <div className="hidden md:block">
            <Button
              variant="outline"
              className="h-10 rounded-full border-0 bg-white/60 px-7 text-sm font-medium text-slate-900 shadow-[0_0_0_1px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.04),0_2px_4px_rgba(0,0,0,0.02)] backdrop-blur-md transition-all hover:text-black"
            >
              {signInLabel}
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="z-50 p-2 md:hidden"
          >
            <div className="flex w-5 flex-col gap-1.5">
              <span
                className={cn(
                  "h-0.5 bg-slate-900 transition-transform",
                  isMobileMenuOpen ? "translate-y-2 rotate-45" : "",
                )}
              />
              <span
                className={cn(
                  "h-0.5 bg-slate-900 transition-opacity",
                  isMobileMenuOpen ? "opacity-0" : "",
                )}
              />
              <span
                className={cn(
                  "h-0.5 bg-slate-900 transition-transform",
                  isMobileMenuOpen ? "-translate-y-2 -rotate-45" : "",
                )}
              />
            </div>
          </button>
        </header>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute inset-0 z-40 flex h-screen flex-col bg-white px-6 pt-24 pb-6"
          >
            <nav className="flex flex-col gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => {
                    if (link.href === "#") e.preventDefault();
                    setActiveLink(link.label);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 text-2xl font-semibold",
                    activeLink === link.label ? "text-slate-900" : "text-slate-400",
                  )}
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-auto">
              <Button className="h-12 w-full rounded-full bg-[oklch(0.6378_0.1051_172.72)] text-base text-white hover:opacity-90">
                {signInLabel}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col justify-center px-6 py-12 md:px-10 md:py-20 lg:px-16 xl:px-24"
      >
        <div className="max-w-2xl lg:max-w-3xl">
          <motion.h1
            variants={itemVariants}
            className="text-5xl leading-[1.08] font-medium tracking-tight text-slate-900 md:text-6xl lg:text-7xl"
          >
            {headline}
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mt-4 max-w-2xl text-base leading-relaxed whitespace-pre-line text-slate-500 md:text-lg"
          >
            {description}
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center"
          >
            <Button className="group h-12 rounded-full border-0 bg-[oklch(0.6378_0.1051_172.72)] px-8 text-sm font-medium text-white shadow-[0_0_0_1px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.3),0_4px_16px_rgba(0,0,0,0.1)] transition-all hover:brightness-105 md:text-base">
              {primaryCtaLabel}
              <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>

            <Button
              variant="secondary"
              className="h-12 rounded-full border-0 bg-[#eaeff1]/80 px-8 text-sm font-medium text-slate-900 shadow-[0_0_0_1px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_4px_rgba(0,0,0,0.02)] backdrop-blur-sm transition-all hover:bg-[#eaeff1] md:text-base"
            >
              {secondaryCtaLabel}
              <Play className="ml-2 h-3.5 w-3.5 fill-slate-900" />
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-x-6 gap-y-8 px-6 pb-8 md:flex-row md:px-10 md:pb-12 lg:px-16 xl:px-24"
      >
        {/* Social Links */}
        <div className="flex w-full items-center justify-center gap-8 md:w-auto md:justify-start lg:gap-14">
          {socialLinks.map((social) => (
            <a
              key={social.label}
              href={social.href}
              className="text-sm text-slate-500 transition-colors hover:text-slate-900 md:text-base"
            >
              {social.label}
            </a>
          ))}
        </div>

        {/* Scroll Indicator */}
        <div className="group flex w-full cursor-pointer items-center justify-start gap-2 text-sm text-slate-500 md:w-auto md:justify-end md:text-base">
          <span>Scroll to Discover</span>
          <motion.span
            animate={{ y: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <ArrowDown
              className="h-4 w-4 transition-transform group-hover:translate-y-1"
              strokeWidth={1.5}
            />
          </motion.span>
        </div>
      </motion.div>
    </section>
  );
}
