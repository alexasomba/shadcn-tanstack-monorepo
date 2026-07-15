import { CaretLeft } from "@phosphor-icons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";

import { AdminPage, AdminPageHeader } from "../../components/admin/admin-page";
import { CrmRecordWorkspace } from "../../components/crm/CrmRecordWorkspace";
import { getCrmRecordWorkspaceFn } from "../../lib/crm.functions";

export const Route = createFileRoute("/_protected/crm/companies/$companyId")({
  loader: async ({ params }) => {
    const workspace = await getCrmRecordWorkspaceFn({
      data: { objectKey: "companies", recordId: params.companyId },
    });

    if (!workspace) {
      throw redirect({ to: "/crm" });
    }

    return workspace;
  },
  component: CrmCompanyRecordPage,
});

function CrmCompanyRecordPage() {
  const loaderData: unknown = Route.useLoaderData();
  const workspace = loaderData as Record<string, unknown> & {
    object: { labelSingular: string };
  };

  return (
    <AdminPage>
      <AdminPageHeader
        title={workspace.object.labelSingular}
        description="CRM company record workspace."
        badge={
          <Button render={<Link to="/crm" />} variant="ghost" size="icon" aria-label="Back to CRM">
            <CaretLeft className="size-5" />
          </Button>
        }
      />
      <CrmRecordWorkspace workspace={workspace} />
    </AdminPage>
  );
}
