import { ButtonLink } from "@workspace/ui/components/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

type SettingsStubProps = {
  title: string;
  description: string;
  milestone: string;
  /** Optional secondary CTA (e.g. pricing). */
  action?: { to: "/pricing" | "/dashboard" | "/settings/organization"; label: string };
};

/** Placeholder for settings sections filled in later milestones. */
export function SettingsStub({ title, description, milestone, action }: SettingsStubProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Coming soon</CardTitle>
          <CardDescription>
            Full product UI ships in{" "}
            <span className="font-medium text-foreground">{milestone}</span>. Backend plugins and
            APIs may already exist.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <ButtonLink to="/dashboard" variant="outline" size="sm">
            Back to overview
          </ButtonLink>
          {action ? (
            <ButtonLink to={action.to} size="sm">
              {action.label}
            </ButtonLink>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
