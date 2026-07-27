import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group";

import { m } from "#/paraglide/messages";
import { getLocale, locales, setLocale } from "#/paraglide/runtime";

export default function ParaglideLocaleSwitcher() {
  const currentLocale = getLocale();

  return (
    <div className="flex items-center gap-2 text-foreground" aria-label={m.language_label()}>
      <span className="text-xs text-muted-foreground">
        {m.current_locale({ locale: currentLocale })}
      </span>
      <ToggleGroup
        value={[currentLocale]}
        onValueChange={(val) => {
          const nextLocale = val[val.length - 1];
          if (nextLocale && (locales as readonly string[]).includes(nextLocale)) {
            setLocale(nextLocale as (typeof locales)[number]);
          }
        }}
        variant="outline"
        size="sm"
        spacing={1}
      >
        {locales.map((locale) => (
          <ToggleGroupItem
            key={locale}
            value={locale}
            aria-label={locale.toUpperCase()}
            className="px-2.5 text-xs font-semibold"
          >
            {locale.toUpperCase()}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
