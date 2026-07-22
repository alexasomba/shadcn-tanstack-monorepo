import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import type { ReactNode } from "react";

export interface Footer5Link {
  label: string;
  href: string;
}

export interface Footer5LinkGroup {
  title: string;
  links: Footer5Link[];
}

export interface Footer5SocialLink {
  icon: ReactNode;
  href: string;
  label: string;
}

export interface Footer5ContactCta {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
}

export interface Footer5Props {
  logo?: ReactNode;
  brandName: string;
  topNavLabel?: string;
  socialLinks?: Footer5SocialLink[];
  contactCta?: Footer5ContactCta;
  linkGroups?: Footer5LinkGroup[];
  brandWatermark?: string;
  copyright: string;
  legalLinks?: Footer5Link[];
}

export function Footer5({
  logo,
  brandName,
  topNavLabel,
  socialLinks = [],
  contactCta,
  linkGroups = [],
  brandWatermark,
  copyright,
  legalLinks = [],
}: Footer5Props) {
  return (
    <footer className="w-full bg-background">
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-6 md:px-12">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            {logo && <div className="text-foreground">{logo}</div>}
            <span className="text-lg font-semibold tracking-tight text-foreground">
              {brandName}
            </span>
          </div>

          <div className="flex items-center gap-5">
            {topNavLabel && (
              <span className="hidden text-sm text-primary sm:inline">{topNavLabel}</span>
            )}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-2">
                {socialLinks.map((link, index) => (
                  <Button
                    key={index}
                    size="icon"
                    variant="outline"
                    render={
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={link.label}
                      >
                        {link.icon}
                      </a>
                    }
                    className="h-9 w-9 bg-muted text-foreground shadow-[0_0_0_0.5px_rgba(0,0,0,0.03),0_2px_4px_0_rgba(0,0,0,0.05),inset_0_2px_0_0px_rgba(255,255,255,0.5)] transition-colors outline-none hover:text-foreground dark:shadow-[0_0_0_0.5px_rgba(0,0,0,0.03),0_2px_4px_0_rgba(0,0,0,0.05),inset_0_2px_0_0px_rgba(255,255,255,0.1)]"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <Separator className="opacity-50" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12 md:px-12 md:py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          {contactCta && (
            <div className="flex flex-col gap-6 lg:col-span-4">
              <h3 className="text-sm font-semibold text-foreground">Get in touch</h3>

              <a
                href={contactCta.href}
                className="group flex items-start gap-4 rounded-2xl border bg-muted p-5 shadow-[0_0_0_0.5px_rgba(0,0,0,0.03),0_2px_4px_0_rgba(0,0,0,0.05),inset_0_2px_0_0px_rgba(255,255,255,0.5)] transition-colors hover:bg-muted/80 dark:shadow-[0_0_0_0.5px_rgba(0,0,0,0.03),0_2px_4px_0_rgba(0,0,0,0.05),inset_0_2px_0_0px_rgba(255,255,255,0.1)]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary bg-primary text-primary-foreground shadow-[0_0_0_0.5px_rgba(0,0,0,0.03),0_2px_4px_0_rgba(0,0,0,0.05),inset_0_2px_0_0px_rgba(255,255,255,0.5)]">
                  {contactCta.icon}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                    {contactCta.title}
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {contactCta.description}
                  </span>
                </div>
              </a>
            </div>
          )}

          {linkGroups.length > 0 && (
            <div className={contactCta ? "lg:col-span-8" : "lg:col-span-12"}>
              <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:gap-12">
                {linkGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="flex flex-col gap-4">
                    <h4 className="text-sm font-semibold text-foreground">{group.title}</h4>
                    <ul className="flex flex-col gap-3">
                      {group.links.map((link, linkIndex) => (
                        <li key={linkIndex}>
                          <a
                            href={link.href}
                            className="text-sm text-muted-foreground transition-colors hover:text-primary"
                          >
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative mx-auto flex max-w-7xl items-center justify-center px-6 md:px-12">
        {brandWatermark && (
          <div className="relative overflow-hidden">
            <div className="flex items-end justify-center gap-4 pt-4 pb-0 tracking-widest md:gap-6">
              {logo && (
                <div className="shrink-0 text-muted">
                  <div className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-40 lg:w-40 [&>svg]:h-full [&>svg]:w-full">
                    {logo}
                  </div>
                </div>
              )}
              <span className="text-7xl leading-none font-bold text-muted select-none sm:text-8xl md:text-9xl lg:text-[11rem] xl:text-[14rem]">
                {brandWatermark}
              </span>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background to-transparent" />
          </div>
        )}
        <div className="absolute bottom-0 flex w-full translate-y-5 flex-col items-center justify-between gap-1 px-12 sm:translate-y-0 sm:flex-row">
          <p className="text-xs text-muted-foreground">{copyright}</p>

          {legalLinks.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 md:gap-6">
              {legalLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
