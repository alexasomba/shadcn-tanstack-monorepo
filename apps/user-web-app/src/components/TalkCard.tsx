import { Clock, User } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@workspace/ui/components/card";
import type { Talk } from "content-collections";

interface TalkCardProps {
  talk: Talk;
  featured?: boolean;
}

export default function TalkCard({ talk, featured = false }: TalkCardProps) {
  return (
    <Link to="/talks/$slug" params={{ slug: talk.slug }} className="group relative block">
      <Card
        className={`card-hover relative overflow-hidden border-border/50 bg-card ${featured ? "aspect-[16/10]" : "aspect-[16/9]"} hover:border-gold/50`}
      >
        {/* Image */}
        <div className="absolute inset-0">
          <img src={`/${talk.image}`} alt={talk.title} className="h-full w-full object-cover" />
          <div className="from-charcoal via-charcoal/60 absolute inset-0 bg-gradient-to-t to-transparent" />
        </div>

        {/* Content overlay */}
        <CardContent className="absolute right-0 bottom-0 left-0 z-10 p-6">
          <div className="space-y-3">
            {/* Topics */}
            <div className="flex flex-wrap gap-2">
              {talk.topics.slice(0, 2).map((topic) => (
                <span
                  key={topic}
                  className="bg-gold/15 text-gold border-gold/30 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase"
                >
                  {topic}
                </span>
              ))}
            </div>

            {/* Title */}
            <h3 className="font-display text-cream group-hover:text-gold text-xl leading-tight font-semibold transition-colors">
              {talk.title}
            </h3>

            {/* Speaker & Duration */}
            <div className="text-cream/60 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>{talk.speaker}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{talk.duration}</span>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Decorative accent */}
        <div className="absolute top-4 right-4">
          <div className="bg-gold/10 border-gold/20 flex h-8 w-8 items-center justify-center rounded-full border">
            <span className="text-gold/60 font-display text-xs">✦</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
