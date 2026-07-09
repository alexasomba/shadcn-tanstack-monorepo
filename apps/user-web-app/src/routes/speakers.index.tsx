import { createFileRoute } from "@tanstack/react-router";
import { allSpeakers } from "content-collections";

import RemyAssistant from "#/components/RemyAssistant";
import SpeakerCard from "#/components/SpeakerCard";

export const Route = createFileRoute("/speakers/")({
  component: SpeakersPage,
});

function SpeakersPage() {
  return (
    <>
      <RemyAssistant />
      <div className="min-h-screen">
        {/* Hero section */}
        <div className="relative px-6 py-16">
          <div className="mx-auto max-w-7xl text-center">
            <h1 className="font-display text-cream mb-4 text-5xl font-bold md:text-6xl">
              Our <span className="text-gold italic">Distinguished</span> Speakers
            </h1>
            <p className="text-cream/70 font-body mx-auto max-w-2xl text-xl">
              Meet the world-renowned pastry chefs and master bakers who will share their expertise
              at Haute Pâtisserie 2026.
            </p>
          </div>
        </div>

        {/* Speakers grid */}
        <div className="mx-auto max-w-7xl px-6 pb-20">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {allSpeakers.map((speaker) => (
              <SpeakerCard key={speaker.slug} speaker={speaker} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
