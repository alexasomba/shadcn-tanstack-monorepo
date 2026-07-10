import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { cn } from "@workspace/ui/lib/utils";
import React from "react";
import { FaPlus, FaMinus } from "react-icons/fa";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  date?: string;
}

export interface Faq1Props {
  badge?: string;
  title: React.ReactNode;
  faqs: FaqItem[];
  footerText?: string;
  footerLinkText?: string;
  footerLinkHref?: string;
  className?: string;
}

export function Faq1({
  badge,
  title,
  faqs,

  className,
}: Faq1Props) {
  return (
    <section className={cn("mx-auto w-full max-w-4xl px-4 py-16 md:py-24", className)}>
      <div className="mb-12 flex flex-col items-center text-center">
        {badge && (
          <span className="mb-6 inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium text-foreground">
            {badge}
          </span>
        )}
        <h2 className="max-w-2xl text-3xl leading-tight font-semibold tracking-tight text-foreground md:text-5xl md:leading-tight">
          {title}
        </h2>
      </div>

      <Accordion type="single" collapsible className="w-full gap-2">
        {faqs.map((faq) => (
          <AccordionItem
            key={faq.id}
            value={faq.id}
            className="rounded-none border border-dashed border-none bg-muted/50 px-6"
          >
            <AccordionTrigger className="group flex items-center py-6 hover:no-underline [&_[data-slot=accordion-trigger-icon]]:!hidden">
              <span className="pr-4 text-left text-base font-medium text-foreground md:text-lg">
                {faq.question}
              </span>
              <div className="ml-auto flex shrink-0 items-center justify-center text-muted-foreground">
                <FaPlus className="block h-4 w-4 group-data-[state=open]:hidden" />
                <FaMinus className="hidden h-4 w-4 group-data-[state=open]:block" />
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-0 pb-6">
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                {faq.answer}
              </p>
              {faq.date && (
                <div className="mt-4 text-sm font-medium text-muted-foreground/70">{faq.date}</div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
