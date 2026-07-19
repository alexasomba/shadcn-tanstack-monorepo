import { CaretRight, FileText, Folder, House } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";

type BreadcrumbSegment =
  | {
      label: string;
      href: string;
      icon: Icon;
      current?: false;
    }
  | {
      label: string;
      icon: Icon;
      current: true;
      href?: never;
    };

const segments: readonly BreadcrumbSegment[] = [
  { label: "Home", href: "#", icon: House },
  { label: "Reports", href: "#", icon: Folder },
  { label: "Revenue Summary", icon: FileText, current: true },
] as const;

const Breadcrumb3 = () => {
  return (
    <Breadcrumb>
      <BreadcrumbList className="gap-1.5 text-sm">
        {segments.map((segment, index) => {
          const Icon = segment.icon;

          return (
            <BreadcrumbItem key={segment.label}>
              {"href" in segment ? (
                <BreadcrumbLink
                  href={segment.href}
                  className="flex items-center gap-1.5 rounded-sm px-1 py-0.5 hover:text-foreground"
                >
                  <Icon className="size-3.5 text-muted-foreground" />
                  {index === 0 ? <span className="text-sm">Home</span> : segment.label}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="flex items-center gap-1.5 rounded-sm px-1 py-0.5 font-medium">
                  <Icon className="size-3.5 text-foreground/80" />
                  {segment.label}
                </BreadcrumbPage>
              )}
              {index < segments.length - 1 ? (
                <BreadcrumbSeparator className="text-muted-foreground/70">
                  <CaretRight />
                </BreadcrumbSeparator>
              ) : null}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default Breadcrumb3;
