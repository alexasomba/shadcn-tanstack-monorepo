import { ArrowRight, Calendar, MapPin, Users } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { allSpeakers, allTalks } from "content-collections";

import HeroCarousel from "#/components/HeroCarousel";
import RemyAssistant from "#/components/RemyAssistant";
import SpeakerCard from "#/components/SpeakerCard";
import TalkCard from "#/components/TalkCard";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const featuredSpeakers = allSpeakers.slice(0, 3);
  const featuredTalks = allTalks.slice(0, 4);

  return (
    <>
      <RemyAssistant />

      {/* Hero Section */}
      <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-6">
        {/* Background carousel */}
        <HeroCarousel />

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          {/* Event date badge */}
          <div className="bg-copper/10 border-copper/30 text-copper-light mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            <span>March 15-17, 2026</span>
            <span className="text-copper/40 mx-2">•</span>
            <MapPin className="h-4 w-4" />
            <span>Paris, France</span>
          </div>

          {/* Main title */}
          <h1 className="font-display text-cream mb-6 text-6xl leading-tight font-bold md:text-8xl">
            Haute
            <span className="text-gold block italic">Pâtisserie</span>
          </h1>

          <p className="text-cream/70 font-body mx-auto mb-10 max-w-3xl text-xl leading-relaxed md:text-2xl">
            Join the world's most celebrated pastry chefs and master bakers for three extraordinary
            days of masterclasses, demonstrations, and culinary inspiration.
          </p>

          {/* Stats */}
          <div className="mb-12 flex flex-wrap justify-center gap-8">
            <div className="text-center">
              <div className="font-display text-gold text-4xl font-bold">{allSpeakers.length}</div>
              <div className="text-cream/50 text-sm tracking-wider uppercase">Master Chefs</div>
            </div>
            <div className="text-center">
              <div className="font-display text-gold text-4xl font-bold">{allTalks.length}</div>
              <div className="text-cream/50 text-sm tracking-wider uppercase">Sessions</div>
            </div>
            <div className="text-center">
              <div className="font-display text-gold text-4xl font-bold">3</div>
              <div className="text-cream/50 text-sm tracking-wider uppercase">Days</div>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/speakers"
              className="from-copper to-copper-dark text-charcoal hover:shadow-copper/30 inline-flex items-center gap-2 rounded-full bg-gradient-to-r px-8 py-4 text-lg font-semibold transition-all hover:scale-[1.02] hover:shadow-lg"
            >
              <Users className="h-5 w-5" />
              Meet Our Speakers
            </Link>
            <Link
              to="/talks"
              className="border-gold/50 text-gold hover:bg-gold/10 hover:border-gold inline-flex items-center gap-2 rounded-full border-2 px-8 py-4 text-lg font-semibold transition-all"
            >
              View Sessions
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Speakers Section */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <h2 className="font-display text-cream mb-3 text-4xl font-bold md:text-5xl">
                Featured <span className="text-gold italic">Speakers</span>
              </h2>
              <p className="text-cream/60 font-body text-lg">
                Learn from award-winning pastry chefs and master bakers
              </p>
            </div>
            <Link
              to="/speakers"
              className="text-gold hover:text-gold/80 hidden items-center gap-2 font-medium transition-colors md:inline-flex"
            >
              View all speakers
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {featuredSpeakers.map((speaker) => (
              <SpeakerCard key={speaker.slug} speaker={speaker} featured />
            ))}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link
              to="/speakers"
              className="text-gold hover:text-gold/80 inline-flex items-center gap-2 font-medium transition-colors"
            >
              View all speakers
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-7xl px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Featured Sessions Section */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <h2 className="font-display text-cream mb-3 text-4xl font-bold md:text-5xl">
                Featured <span className="text-gold italic">Sessions</span>
              </h2>
              <p className="text-cream/60 font-body text-lg">
                Masterclasses and demonstrations to elevate your craft
              </p>
            </div>
            <Link
              to="/talks"
              className="text-gold hover:text-gold/80 hidden items-center gap-2 font-medium transition-colors md:inline-flex"
            >
              View all sessions
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {featuredTalks.map((talk) => (
              <TalkCard key={talk.slug} talk={talk} featured />
            ))}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link
              to="/talks"
              className="text-gold hover:text-gold/80 inline-flex items-center gap-2 font-medium transition-colors"
            >
              View all sessions
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="to-charcoal relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card p-12">
            {/* Decorative elements */}
            <div className="bg-copper/5 absolute top-0 right-0 h-64 w-64 rounded-full blur-3xl" />
            <div className="bg-gold/5 absolute bottom-0 left-0 h-48 w-48 rounded-full blur-3xl" />

            <div className="relative">
              <h2 className="font-display text-cream mb-4 text-3xl font-bold md:text-4xl">
                Ready to Elevate Your Craft?
              </h2>
              <p className="text-cream/60 font-body mx-auto mb-8 max-w-2xl text-lg">
                Join us in Paris for an unforgettable experience with the world's finest pastry
                artisans.
              </p>
              <div className="bg-gold/10 border-gold/30 text-gold inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium">
                <span>🥐</span>
                <span>Registration opens January 2026</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
