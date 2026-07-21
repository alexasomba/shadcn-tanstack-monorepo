import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@workspace/ui/components/button";
import { ButtonLink } from "@workspace/ui/components/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { useState } from "react";

import { ReferralCard } from "#/components/auth/ReferralCard";
import { ImageUploadField } from "#/components/media/image-upload-field";
import { authClient } from "#/lib/auth-client";
import { uploadUserAvatar } from "#/lib/media.functions";

export const Route = createFileRoute("/_protected/account")({
  component: AccountPage,
  head: () => ({
    meta: [{ title: "Account — Settings" }],
  }),
});

function AccountPage() {
  const { user } = Route.useRouteContext();
  const uploadAvatar = useServerFn(uploadUserAvatar);
  const [imageUrl, setImageUrl] = useState<string | null>(
    typeof user.image === "string" ? user.image : null,
  );
  const [banner, setBanner] = useState<string | null>(null);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Profile, avatar, referrals, and sign-out. Security settings live under Security.
        </p>
      </div>

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Signed in with Better Auth</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
            <div className="size-12 shrink-0 overflow-hidden rounded-full border border-border/70 bg-background">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                  {(user.name || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <ImageUploadField
            kind="avatar"
            label="Avatar"
            description="Stored in Cloudflare R2 and served from /api/media. Available on all plans."
            currentUrl={imageUrl}
            onUpload={async (payload) => {
              setBanner(null);
              const result = await uploadAvatar({ data: payload });
              setImageUrl(result.url);
              setBanner("Avatar updated");
              // Refresh session so shell/nav pick up the new image.
              await authClient.getSession();
            }}
          />

          {banner ? (
            <p className="text-sm text-muted-foreground" role="status">
              {banner}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/dashboard" size="sm">
              Overview
            </ButtonLink>
            <ButtonLink to="/settings/security" variant="outline" size="sm">
              Security
            </ButtonLink>
            <ButtonLink to="/" variant="outline" size="sm">
              Marketing site
            </ButtonLink>
          </div>

          <ReferralCard />

          <Separator />

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              void authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    window.location.href = "/login";
                  },
                },
              });
            }}
          >
            Sign out
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Full-page reload on sign-out clears session cookies cleanly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
