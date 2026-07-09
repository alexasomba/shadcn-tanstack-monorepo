import { Clock, Calendar, MapPin, CaretRight } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { allTalks, allSpeakers } from "content-collections";
import { useState } from "react";

import RemyAssistant from "#/components/RemyAssistant";

export const Route = createFileRoute("/schedule/")({
  component: SchedulePage,
});

// Helper to get speaker data by name
function getSpeakerByName(name: string) {
  return allSpeakers.find((s) => s.name.toLowerCase() === name.toLowerCase());
}

// Define the conference schedule with time slots
const scheduleData = [
  {
    day: 1,
    date: "March 15, 2026",
    dayName: "Day One",
    theme: "French Foundations",
    sessions: [
      { time: "9:00 AM", talkSlug: "french-macaron-mastery" },
      { time: "11:30 AM", talkSlug: "croissant-lamination-secrets" },
      { time: "3:00 PM", talkSlug: "the-science-of-sugar" },
    ],
  },
  {
    day: 2,
    date: "March 16, 2026",
    dayName: "Day Two",
    theme: "Global Traditions",
    sessions: [
      { time: "9:00 AM", talkSlug: "sourdough-from-starter-to-masterpiece" },
      { time: "11:30 AM", talkSlug: "umami-in-pastry-east-meets-west" },
      { time: "2:30 PM", talkSlug: "savory-breads-of-the-mediterranean" },
    ],
  },
  {
    day: 3,
    date: "March 17, 2026",
    dayName: "Day Three",
    theme: "Artisan Mastery",
    sessions: [
      { time: "9:00 AM", talkSlug: "the-art-of-the-perfect-tart" },
      {
        time: "11:00 AM",
        talkSlug: "neapolitan-pizza-tradition-meets-innovation",
      },
    ],
  },
];

function SchedulePage() {
  const [selectedDay, setSelectedDay] = useState(1);

  const currentDayData = scheduleData.find((d) => d.day === selectedDay)!;

  return (
    <>
      <RemyAssistant />
      <div className="min-h-screen">
        {/* Hero section */}
        <div className="relative px-6 py-16">
          <div className="mx-auto max-w-7xl text-center">
            <div className="bg-copper/10 border-copper/30 text-copper-light mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              <span>March 15-17, 2026</span>
              <span className="text-copper/40 mx-2">•</span>
              <MapPin className="h-4 w-4" />
              <span>Paris, France</span>
            </div>
            <h1 className="font-display text-cream mb-4 text-5xl font-bold md:text-6xl">
              Conference <span className="text-gold italic">Schedule</span>
            </h1>
            <p className="text-cream/70 font-body mx-auto max-w-2xl text-xl">
              Three days of masterclasses, demonstrations, and culinary inspiration from the world's
              finest pastry artisans.
            </p>
          </div>
        </div>

        {/* Day selector tabs */}
        <div className="mx-auto mb-12 max-w-7xl px-6">
          <div className="flex justify-center">
            <div className="inline-flex rounded-2xl border border-border/50 bg-card/50 p-2">
              {scheduleData.map((day) => (
                <button
                  key={day.day}
                  onClick={() => setSelectedDay(day.day)}
                  className={`font-display relative rounded-xl px-8 py-4 font-semibold transition-all duration-300 ${
                    selectedDay === day.day
                      ? "from-copper to-copper-dark text-charcoal shadow-copper/20 bg-gradient-to-br shadow-lg"
                      : "text-cream/70 hover:text-cream hover:bg-card"
                  }`}
                >
                  <span className="block text-xs tracking-wider uppercase opacity-75">
                    {day.dayName}
                  </span>
                  <span className="block text-lg">
                    {day.date.split(",")[0].split(" ").slice(0, 2).join(" ")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Day theme header */}
        <div className="mx-auto mb-8 max-w-7xl px-6">
          <div className="text-center">
            <h2 className="font-display text-cream mb-2 text-3xl font-bold">
              {currentDayData.dayName}:{" "}
              <span className="text-gold italic">{currentDayData.theme}</span>
            </h2>
            <p className="text-cream/50 font-body">{currentDayData.date}</p>
          </div>
        </div>

        {/* Schedule timeline */}
        <div className="mx-auto max-w-5xl px-6 pb-20">
          <div className="relative">
            {/* Timeline line */}
            <div className="from-copper via-gold to-copper/30 absolute top-0 bottom-0 left-8 w-px bg-gradient-to-b md:left-12" />

            {/* Sessions */}
            <div className="space-y-8">
              {currentDayData.sessions.map((session, index) => {
                const talk = allTalks.find((t) => t.slug === session.talkSlug);
                if (!talk) return null;

                const speaker = getSpeakerByName(talk.speaker);

                return (
                  <Link
                    key={session.talkSlug}
                    to="/talks/$slug"
                    params={{ slug: talk.slug }}
                    className="group block"
                  >
                    <div className="relative flex gap-6 md:gap-10">
                      {/* Time marker */}
                      <div className="w-16 flex-shrink-0 pt-6 md:w-24">
                        <div className="relative">
                          {/* Timeline dot */}
                          <div className="bg-charcoal border-gold group-hover:border-copper absolute top-0 -right-[13px] flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all group-hover:scale-110 md:-right-[17px]">
                            <div className="bg-gold group-hover:bg-copper h-2 w-2 rounded-full transition-colors" />
                          </div>
                          <span className="font-display text-copper-light block text-right text-sm font-semibold md:text-base">
                            {session.time}
                          </span>
                        </div>
                      </div>

                      {/* Session card */}
                      <div
                        className="group-hover:border-gold/50 group-hover:shadow-gold/5 relative flex-1 overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl"
                        style={{
                          animationDelay: `${index * 100}ms`,
                        }}
                      >
                        {/* Background image with overlay */}
                        <div className="absolute inset-0">
                          <img
                            src={`/${talk.image}`}
                            alt={talk.title}
                            className="h-full w-full object-cover opacity-30 transition-all duration-500 group-hover:scale-105 group-hover:opacity-40"
                          />
                          <div className="from-charcoal via-charcoal/95 to-charcoal/80 absolute inset-0 bg-gradient-to-r" />
                        </div>

                        {/* Content */}
                        <div className="relative flex flex-col items-start gap-6 p-6 md:flex-row md:p-8">
                          {/* Speaker image */}
                          {speaker && (
                            <div className="flex-shrink-0">
                              <div className="border-gold/30 group-hover:border-gold/60 relative h-20 w-20 overflow-hidden rounded-xl border-2 shadow-lg transition-colors md:h-24 md:w-24">
                                <img
                                  src={`/${speaker.headshot}`}
                                  alt={speaker.name}
                                  className="h-full w-full object-cover"
                                />
                                <div className="from-charcoal/40 absolute inset-0 bg-gradient-to-t to-transparent" />
                              </div>
                            </div>
                          )}

                          {/* Talk info */}
                          <div className="min-w-0 flex-1">
                            {/* Topics */}
                            <div className="mb-3 flex flex-wrap gap-2">
                              {talk.topics.slice(0, 3).map((topic) => (
                                <span
                                  key={topic}
                                  className="bg-gold/10 text-gold border-gold/20 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>

                            {/* Title */}
                            <h3 className="font-display text-cream group-hover:text-gold mb-2 text-xl leading-tight font-semibold transition-colors md:text-2xl">
                              {talk.title}
                            </h3>

                            {/* Speaker & Duration */}
                            <div className="text-cream/60 mb-3 flex flex-wrap items-center gap-4 text-sm">
                              <span className="text-copper-light font-medium">{talk.speaker}</span>
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{talk.duration}</span>
                              </div>
                            </div>

                            {/* Speaker title if available */}
                            {speaker && (
                              <p className="text-cream/50 font-body text-sm">
                                {speaker.title} at {speaker.restaurant}
                              </p>
                            )}
                          </div>

                          {/* Arrow indicator */}
                          <div className="flex-shrink-0 self-center">
                            <div className="bg-gold/10 border-gold/20 group-hover:bg-gold/20 group-hover:border-gold/40 flex h-10 w-10 items-center justify-center rounded-full border transition-all">
                              <CaretRight className="text-gold h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mx-auto max-w-4xl px-6 pb-20">
          <div className="to-charcoal relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card p-8 text-center md:p-12">
            <div className="bg-copper/5 absolute top-0 right-0 h-64 w-64 rounded-full blur-3xl" />
            <div className="bg-gold/5 absolute bottom-0 left-0 h-48 w-48 rounded-full blur-3xl" />

            <div className="relative">
              <h3 className="font-display text-cream mb-3 text-2xl font-bold md:text-3xl">
                Don't Miss a Single Session
              </h3>
              <p className="text-cream/60 font-body mx-auto mb-6 max-w-xl">
                Each masterclass offers hands-on learning from the world's finest pastry artisans.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  to="/talks"
                  className="from-copper to-copper-dark text-charcoal hover:shadow-copper/30 inline-flex items-center gap-2 rounded-full bg-gradient-to-r px-6 py-3 font-semibold transition-all hover:scale-[1.02] hover:shadow-lg"
                >
                  Browse All Sessions
                </Link>
                <Link
                  to="/speakers"
                  className="border-gold/50 text-gold hover:bg-gold/10 hover:border-gold inline-flex items-center gap-2 rounded-full border-2 px-6 py-3 font-semibold transition-all"
                >
                  Meet the Speakers
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
