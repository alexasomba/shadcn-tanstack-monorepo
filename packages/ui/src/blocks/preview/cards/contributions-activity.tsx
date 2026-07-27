"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field";
import { toast } from "@workspace/ui/components/toast";
import * as React from "react";

export function ContributionsActivity() {
  const [isPending, setIsPending] = React.useState(false);

  return (
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setIsPending(true);
          toast
            .promise(new Promise((resolve) => setTimeout(resolve, 800)), {
              loading: "Saving activity preferences...",
              success: "Preferences saved",
              error: "Failed to save preferences",
            })
            .finally(() => setIsPending(false));
        }}
      >
        <CardHeader>
          <CardTitle>Contributions & Activity</CardTitle>
          <CardDescription>Manage your contributions and activity visibility.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <FieldSet>
              <FieldLegend className="sr-only">Contributions & activity</FieldLegend>
              <FieldGroup>
                <Field orientation="horizontal">
                  <Checkbox
                    id="activity-private-profile"
                    name="private_profile"
                    disabled={isPending}
                  />
                  <FieldContent>
                    <FieldLabel htmlFor="activity-private-profile">
                      Make profile private and hide activity
                    </FieldLabel>
                    <FieldDescription>
                      Enabling this will hide your contributions and activity from your GitHub
                      profile and from social features like followers, stars, feeds, leaderboards
                      and releases.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>
            </FieldSet>
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isPending} className="style-sera:w-full">
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
