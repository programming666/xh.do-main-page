"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Hidden <input type="file"> behind a design-system button. It reports the
 * chosen file name next to the button so the admin can see that the picker
 * actually registered a selection before the upload resolves.
 */
export function FilePicker({
  accept,
  onSelect,
}: {
  accept: string;
  onSelect: (file?: File | null) => Promise<void> | void;
}) {
  const t = useTranslations("common");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>(t("noFileSelected"));

  return (
    <div className="admin-filepicker">
      <button type="button" className="admin-btn" data-size="sm" onClick={() => inputRef.current?.click()}>
        <Upload className="h-3.5 w-3.5" />
        {t("chooseFileLabel")}
      </button>
      <span className="admin-filepicker-name">{fileName}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          setFileName(file?.name ?? t("noFileSelected"));
          await onSelect(file);
        }}
      />
    </div>
  );
}
