import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { useState } from "react";
import { FiPlus, FiMinus } from "react-icons/fi";

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

export interface FAQSectionProps {
  badge?: string;
  title?: string;
  subtitle?: string;
  categories: FAQCategory[];
  contactLabel?: string;
  contactEmail?: string;
}

interface CategoryTabProps {
  category: FAQCategory;
  isActive: boolean;
  onClick: () => void;
}

function CategoryTab({ category, isActive, onClick }: CategoryTabProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      } `}
    >
      <span className={`text-xs ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`}>
        {category.icon}
      </span>
      {category.label}
    </button>
  );
}

export default function FAQ2({
  badge = "Need help?",
  title = "Frequently asked questions",
  subtitle = "Find quick answers about our pricing, onboarding, and performance tracking tools.",
  categories,
}: FAQSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id ?? "");

  const currentItems = categories.find((c) => c.id === activeCategory)?.items ?? [];

  const handleCategoryChange = (id: string) => {
    setActiveCategory(id);
  };

  return (
    <section className="flex min-h-screen w-full flex-col items-center bg-background px-4 py-16 md:py-24">
      <div className="mx-auto mb-10 max-w-xl text-center md:mb-12">
        <p className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium tracking-widest text-muted-foreground uppercase">
          <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground" />
          {badge}
        </p>

        <h1 className="mb-4 text-3xl leading-tight font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          {title}
        </h1>

        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
          {subtitle}
        </p>
      </div>

      <div className="mx-auto mb-8 w-full max-w-2xl">
        <div className="scrollbar-hide mx-auto flex w-fit max-w-full items-center gap-1.5 overflow-x-auto rounded-full bg-muted px-1 py-1.5">
          {categories.map((cat) => (
            <CategoryTab
              key={cat.id}
              category={cat}
              isActive={activeCategory === cat.id}
              onClick={() => handleCategoryChange(cat.id)}
            />
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl">
        {currentItems.length > 0 ? (
          <Accordion className="flex w-full flex-col gap-2.5">
            {currentItems.map((item, index) => (
              <AccordionItem
                key={`${activeCategory}-${index}`}
                value={`${activeCategory}-${index}`}
                className="overflow-hidden rounded-xl border border-border bg-muted/50 transition-all duration-300 ease-in-out hover:border-border/80 hover:bg-accent data-[state=open]:bg-background data-[state=open]:shadow-sm"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <AccordionTrigger className="group flex w-full items-center justify-between gap-4 px-5 py-3 text-left hover:no-underline [&_[data-slot=accordion-trigger-icon]]:!hidden">
                  <span className="text-sm leading-snug font-medium text-muted-foreground transition-colors duration-200 group-hover:text-foreground group-data-[state=open]:text-foreground md:text-base">
                    {item.question}
                  </span>
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all duration-300 group-hover:bg-muted-foreground/20 group-data-[state=open]:bg-primary group-data-[state=open]:text-primary-foreground">
                    <FiPlus size={12} className="block group-data-[state=open]:hidden" />
                    <FiMinus size={12} className="hidden group-data-[state=open]:block" />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="rounded-xl bg-muted p-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No questions in this category yet.
          </p>
        )}
      </div>
    </section>
  );
}
