import { MapPin, Trophy, ArrowLeft } from "@phosphor-icons/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { allSpeakers, allTalks } from "content-collections";
import { marked } from "marked";

import RemyAssistant from "#/components/RemyAssistant";
import TalkCard from "#/components/TalkCard";

export const Route = createFileRoute("/speakers/$slug")({
  loader: ({ params }) => {
    const speaker = allSpeakers.find((s) => s.slug === params.slug);
    if (!speaker) {
      throw new Error("Speaker not found");
    }
    const speakerTalks = allTalks.filter((t) => t.speaker === speaker.name);
    return { speaker, speakerTalks };
  },
  component: SpeakerDetailPage,
});

function SpeakerDetailPage() {
  const { speaker, speakerTalks } = Route.useLoaderData();

  return (
    <div className="min-h-screen">
      <RemyAssistant />

      {/* Back navigation */}
      <div className="mx-auto max-w-7xl px-6 py-4">
        <Link
          to="/speakers"
          className="text-cream/60 hover:text-gold inline-flex items-center gap-2 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>All Speakers</span>
        </Link>
      </div>

      {/* Hero section */}
      <div className="relative px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            {/* Photo */}
            <div className="lg:col-span-1">
              <div className="aspect-square overflow-hidden rounded-2xl border border-border/50">
                <img
                  src={`/${speaker.headshot}`}
                  alt={speaker.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex flex-col justify-center lg:col-span-2">
              {/* Specialty tag */}
              <span className="bg-copper/20 text-copper-light border-copper/30 mb-4 inline-block w-fit rounded-full border px-4 py-1.5 text-sm font-medium tracking-wider uppercase">
                {speaker.specialty}
              </span>

              <h1 className="font-display text-cream mb-3 text-5xl font-bold md:text-6xl">
                {speaker.name}
              </h1>

              <p className="text-gold font-display mb-4 text-2xl italic">{speaker.title}</p>

              <div className="text-cream/60 mb-8 flex items-center gap-2 text-lg">
                <MapPin size={20} className="text-copper" />
                <span>
                  {speaker.restaurant}, {speaker.location}
                </span>
              </div>

              {/* Awards */}
              {speaker.awards && speaker.awards.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-cream/50 text-sm font-medium tracking-wider uppercase">
                    Awards & Recognition
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {speaker.awards.map((award) => (
                      <span
                        key={award}
                        className="bg-gold/10 text-gold/90 border-gold/20 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
                      >
                        <Trophy size={14} />
                        {award}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bio section */}
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="prose prose-lg prose-invert prose-p:text-cream/80 prose-headings:text-cream prose-headings:font-display prose-strong:text-cream prose-a:text-gold font-body max-w-none text-lg leading-relaxed">
          <div dangerouslySetInnerHTML={{ __html: marked(speaker.content) }} />
        </div>
      </div>

      {/* Speaker's talks */}
      {speakerTalks.length > 0 && (
        <div className="mx-auto max-w-7xl px-6 py-12">
          <h2 className="font-display text-cream mb-8 text-3xl font-bold">
            Sessions by {speaker.name}
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {speakerTalks.map((talk) => (
              <TalkCard key={talk.slug} talk={talk} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
