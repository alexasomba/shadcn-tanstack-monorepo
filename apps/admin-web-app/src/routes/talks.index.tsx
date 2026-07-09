import { createFileRoute } from "@tanstack/react-router";
import { allTalks } from "content-collections";

import RemyAssistant from "#/components/RemyAssistant";
import TalkCard from "#/components/TalkCard";

export const Route = createFileRoute("/talks/")({
  component: TalksPage,
});

function TalksPage() {
  return (
    <>
      <RemyAssistant />
      <div className="min-h-screen">
        {/* Hero section */}
        <div className="relative px-6 py-16">
          <div className="mx-auto max-w-7xl text-center">
            <h1 className="font-display text-cream mb-4 text-5xl font-bold md:text-6xl">
              Conference <span className="text-gold italic">Sessions</span>
            </h1>
            <p className="text-cream/70 font-body mx-auto max-w-2xl text-xl">
              Immerse yourself in masterclasses and demonstrations covering every aspect of artisan
              baking and pastry.
            </p>
          </div>
        </div>

        {/* Talks grid */}
        <div className="mx-auto max-w-7xl px-6 pb-20">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {allTalks.map((talk) => (
              <TalkCard key={talk.slug} talk={talk} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
