import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { CrmObjectPage } from "../../components/crm/CrmObjectPage";
import { getCrmObjectWorkspaceFn, getCrmRecordWorkspaceFn } from "../../lib/crm.functions";

const crmObjectSearchSchema = z.object({
  preview: z.string().optional().catch(undefined),
  viewId: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/crm/$objectKey")({
  validateSearch: (search) => crmObjectSearchSchema.parse(search),
  loaderDeps: ({ search: { preview, viewId } }) => ({ preview, viewId }),
  loader: async ({ params, deps }) => {
    const objectKey = params.objectKey;
    const [workspace, previewWorkspace] = await Promise.all([
      getCrmObjectWorkspaceFn({ data: { objectKey, viewId: deps.viewId || null } }),
      deps.preview
        ? getCrmRecordWorkspaceFn({
            data: { objectKey, recordId: deps.preview },
          })
        : Promise.resolve(null),
    ]);

    return { previewWorkspace, workspace };
  },
  component: CrmObjectWorkspacePage,
});

function CrmObjectWorkspacePage() {
  const { previewWorkspace, workspace } = Route.useLoaderData();
  const { preview } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <CrmObjectPage
      previewId={preview || null}
      previewWorkspace={previewWorkspace}
      workspace={workspace}
      onViewChange={(viewId) =>
        void navigate({ search: (old) => ({ ...old, viewId: viewId || undefined }) })
      }
      onPreviewChange={(recordId) =>
        void navigate({ search: (old) => ({ ...old, preview: recordId || undefined }) })
      }
    />
  );
}
