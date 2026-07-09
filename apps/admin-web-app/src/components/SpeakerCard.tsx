import { MapPin } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@workspace/ui/components/card";
import type { Speaker } from "content-collections";

interface SpeakerCardProps {
  speaker: Speaker;
  featured?: boolean;
}

export default function SpeakerCard({ speaker, featured = false }: SpeakerCardProps) {
  return (
    <Link to="/speakers/$slug" params={{ slug: speaker.slug }} className="group relative block">
      <Card
        className={`card-hover relative overflow-hidden border-border/50 bg-card ${featured ? "aspect-square" : "aspect-square"} hover:border-copper/50`}
      >
        {/* Headshot */}
        <div className="absolute inset-0">
          <img
            src={`/${speaker.headshot}`}
            alt={speaker.name}
            className="h-full w-full object-cover"
          />
          <div className="from-charcoal via-charcoal/50 absolute inset-0 bg-gradient-to-t to-transparent" />
        </div>

        {/* Content overlay */}
        <CardContent className="absolute right-0 bottom-0 left-0 z-10 p-6">
          <div className="space-y-2">
            {/* Specialty tag */}
            <span className="bg-copper/20 text-copper-light border-copper/30 inline-block rounded-full border px-3 py-1 text-xs font-medium tracking-wider uppercase">
              {speaker.specialty}
            </span>

            {/* Name */}
            <h3 className="font-display text-cream group-hover:text-gold text-2xl font-semibold transition-colors">
              {speaker.name}
            </h3>

            {/* Title & Restaurant */}
            <p className="text-cream/70 font-body text-lg">{speaker.title}</p>

            {/* Location */}
            <div className="text-cream/50 flex items-center gap-2 text-sm">
              <MapPin className="h-3.5 w-3.5" />
              <span>
                {speaker.restaurant}, {speaker.location}
              </span>
            </div>
          </div>
        </CardContent>

        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 h-20 w-20 overflow-hidden">
          <div className="from-copper/20 absolute top-0 right-0 h-28 w-28 translate-x-14 -translate-y-14 rotate-45 transform bg-gradient-to-bl to-transparent" />
        </div>
      </Card>
    </Link>
  );
}
