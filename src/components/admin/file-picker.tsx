"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

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
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-3 py-3 text-sm text-foreground">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        {t("chooseFileLabel")}
      </button>
      <span className="truncate text-[color:var(--muted)]">{fileName}</span>
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
