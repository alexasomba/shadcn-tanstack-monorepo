import { Clock, User, ArrowLeft, Tag } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { allTalks, allSpeakers } from "content-collections";
import { marked } from "marked";

import RemyAssistant from "#/components/RemyAssistant";

export const Route = createFileRoute("/talks/$slug")({
  loader: ({ params }) => {
    const talk = allTalks.find((t) => t.slug === params.slug);
    if (!talk) {
      throw new Error("Talk not found");
    }
    const speaker = allSpeakers.find((s) => s.name === talk.speaker);
    return { talk, speaker };
  },
  component: TalkDetailPage,
});

function TalkDetailPage() {
  const { talk, speaker } = Route.useLoaderData();

  return (
    <div className="min-h-screen">
      <RemyAssistant />

      {/* Back navigation */}
      <div className="mx-auto max-w-7xl px-6 py-4">
        <Link
          to="/talks"
          className="text-cream/60 hover:text-gold inline-flex items-center gap-2 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>All Sessions</span>
        </Link>
      </div>

      {/* Hero image */}
      <div className="relative mx-auto mb-8 h-[40vh] max-w-7xl px-6">
        <div className="h-full w-full overflow-hidden rounded-2xl border border-border/50">
          <img src={`/${talk.image}`} alt={talk.title} className="h-full w-full object-cover" />
        </div>
        <div className="from-charcoal/60 pointer-events-none absolute inset-6 rounded-2xl bg-gradient-to-t to-transparent" />
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6">
        {/* Topics */}
        <div className="mb-6 flex flex-wrap gap-2">
          {talk.topics.map((topic) => (
            <span
              key={topic}
              className="bg-gold/15 text-gold border-gold/30 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium tracking-wide uppercase"
            >
              <Tag size={12} />
              {topic}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="font-display text-cream mb-6 text-4xl leading-tight font-bold md:text-5xl">
          {talk.title}
        </h1>

        {/* Presenter & details */}
        <div className="mb-8 flex flex-wrap items-center gap-6 border-b border-border/40 pb-6 text-sm font-medium">
          {/* Speaker link */}
          {speaker ? (
            <Link
              to="/speakers/$slug"
              params={{ slug: speaker.slug }}
              className="group flex items-center gap-3"
            >
              <div className="h-12 w-12 overflow-hidden rounded-full border border-border/50">
                <img
                  src={`/${speaker.headshot}`}
                  alt={speaker.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-cream group-hover:text-gold font-medium transition-colors">
                  {talk.speaker}
                </p>
                <p className="text-cream/50 text-sm">{speaker.restaurant}</p>
              </div>
            </Link>
          ) : (
            <div className="text-cream/70 flex items-center gap-2">
              <User size={20} className="text-copper" />
              <span>{talk.speaker}</span>
            </div>
          )}

          {/* Duration */}
          <div className="text-cream/60 flex items-center gap-2">
            <Clock size={20} className="text-copper" />
            <span className="text-lg">{talk.duration}</span>
          </div>
        </div>

        {/* Description content */}
        <div className="prose prose-lg prose-invert prose-p:text-cream/80 prose-headings:text-cream prose-headings:font-display prose-strong:text-cream prose-a:text-gold prose-li:text-cream/80 prose-ul:text-cream/80 font-body max-w-none pb-20 text-lg leading-relaxed">
          <div dangerouslySetInnerHTML={{ __html: marked(talk.content) }} />
        </div>
      </div>
    </div>
  );
}
