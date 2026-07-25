import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import * as React from "react";

export interface OnboardingTourProps extends React.HTMLAttributes<HTMLDivElement> {
  anchorName: string;
  positionArea?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  stepNumber?: number;
  totalSteps?: number;
  onNext?: () => void;
  onPrev?: () => void;
  onClose?: () => void;
}

export const OnboardingTour = React.forwardRef<HTMLDivElement, OnboardingTourProps>(
  (
    {
      anchorName,
      positionArea = "bottom center",
      open,
      onOpenChange,
      title,
      description,
      stepNumber,
      totalSteps,
      onNext,
      onPrev,
      onClose,
      className,
      ...props
    },
    ref,
  ) => {
    const internalRef = React.useRef<HTMLDivElement>(null);
    React.useImperativeHandle(ref, () => internalRef.current as HTMLDivElement);

    // Synchronize open state
    React.useEffect(() => {
      const el = internalRef.current;
      if (!el) return;

      const isOpen = el.matches && el.matches(":popover-open");

      if (open && !isOpen) {
        try {
          // @ts-ignore: React 19 typings might not have showPopover yet
          el.showPopover();
          // Route focus to the first button immediately after opening
          const firstBtn = el.querySelector("button");
          if (firstBtn) firstBtn.focus();
        } catch (e) {
          console.error(e);
        }
      } else if (!open && isOpen) {
        try {
          // @ts-ignore: React 19 typings might not have hidePopover yet
          el.hidePopover();
        } catch (e) {
          console.error(e);
        }
      }
    }, [open]);

    React.useEffect(() => {
      const el = internalRef.current;
      if (!el) return;
      const handleToggle = (e: Event & { newState?: string }) => {
        if (e.newState === "closed" && onOpenChange) {
          onOpenChange(false);
        }
      };
      el.addEventListener("toggle", handleToggle);
      return () => el.removeEventListener("toggle", handleToggle);
    }, [onOpenChange]);

    const style = {
      // @ts-ignore - React typings might not support anchor positioning fully yet
      positionAnchor: anchorName,
      positionArea,
      inset: "auto",
      ...props.style,
    } as React.CSSProperties;

    return (
      <div
        ref={internalRef}
        // @ts-ignore: React 19 popover attribute
        popover="manual"
        role="dialog"
        aria-labelledby="tour-title"
        className={cn(
          "bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/5 dark:ring-foreground/10",
          "z-50 m-4 w-80 rounded-[min(var(--radius-4xl),24px)] p-6 outline-none",
          // Fallback if anchor-name is not supported: position fixed at bottom right
          "supports-[not_(position-anchor:--foo)]:[position:fixed] supports-[not_(position-anchor:--foo)]:inset-auto supports-[not_(position-anchor:--foo)]:right-4 supports-[not_(position-anchor:--foo)]:bottom-4",
          className,
        )}
        style={style}
        {...props}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <h2 id="tour-title" className="font-heading text-lg font-medium">
              {title}
            </h2>
            {totalSteps && stepNumber && (
              <span className="text-sm font-medium text-muted-foreground">
                {stepNumber} / {totalSteps}
              </span>
            )}
          </div>
          {description && (
            <div className="text-sm text-balance text-muted-foreground md:text-pretty">
              {description}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (onClose) onClose();
                if (onOpenChange) onOpenChange(false);
                else {
                  try {
                    // @ts-ignore: React 19 typings
                    internalRef.current?.hidePopover();
                  } catch (e) {}
                }
              }}
            >
              Dismiss
            </Button>
            <div className="flex items-center gap-2">
              {onPrev && (
                <Button variant="outline" size="sm" onClick={onPrev}>
                  Previous
                </Button>
              )}
              {onNext && (
                <Button size="sm" onClick={onNext}>
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
OnboardingTour.displayName = "OnboardingTour";
