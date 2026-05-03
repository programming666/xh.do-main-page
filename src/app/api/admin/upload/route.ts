import { NextResponse } from "next/server";

import { withAdminApi } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";
import { UploadValidationError, saveUploadFile } from "@/lib/storage";

export const POST = withAdminApi(async ({ request, session }) => {
  const formData = await request.formData();
  const kind = String(formData.get("kind") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  try {
    const result = await saveUploadFile(file, kind);
    await logAudit({
      action: "upload",
      target: result.url,
      session,
      request,
      metadata: {
        kind: result.kind,
        bytes: result.bytes,
        contentType: result.contentType,
      },
    });
    return NextResponse.json({ url: result.url });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
});
