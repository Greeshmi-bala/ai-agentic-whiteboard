"use client";

import Image from "next/image";
import Link from "next/link";

import {
  Save,
  Loader2,
  Check,
  ChevronDown,
} from "lucide-react";

interface WorkspaceHeaderProps {
  projectName: string;
  activeTab: "whiteboard" | "doc";
  onTabChange: (tab: "whiteboard" | "doc") => void;
  onSave: () => void;
  isSaving: boolean;
  isSaved: boolean;
}

export default function WorkspaceHeader({
  projectName,
  activeTab,
  onTabChange,
  onSave,
  isSaving,
  isSaved,
}: WorkspaceHeaderProps) {
  return (
    <header className="relative z-20 flex min-h-[62px] shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 sm:px-5">
      {/* LEFT: LOGO AND WORKSPACE NAME */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Go to WhizBoard dashboard"
        >
          <Image
            src="/logo.svg"
            alt="WhizBoard"
            width={34}
            height={34}
            priority
            className="h-8 w-8 object-contain"
          />
        </Link>

        <div className="h-7 w-px shrink-0 bg-gray-200" />

        <div className="flex min-w-0 items-center gap-1">
          <input
            aria-label="Workspace name"
            value={projectName}
            readOnly
            title={projectName}
            className="w-full min-w-0 max-w-[190px] truncate border-none bg-transparent text-sm font-semibold text-gray-800 outline-none sm:max-w-[280px] sm:text-base"
          />

          <ChevronDown
            aria-hidden="true"
            className="hidden h-4 w-4 shrink-0 text-gray-400 sm:block"
          />
        </div>
      </div>

      {/* CENTER: WHITEBOARD AND DOC TABS */}
      <nav
        aria-label="Workspace views"
        className="flex shrink-0 items-center gap-0.5 rounded-xl border border-gray-200 bg-gray-50 p-1"
      >
        <button
          type="button"
          onClick={() => onTabChange("whiteboard")}
          aria-pressed={activeTab === "whiteboard"}
          className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-medium transition-all sm:px-3 sm:text-sm ${
            activeTab === "whiteboard"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          Whiteboard
        </button>

        <button
          type="button"
          onClick={() => onTabChange("doc")}
          aria-pressed={activeTab === "doc"}
          className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all sm:px-4 sm:text-sm ${
            activeTab === "doc"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          Doc
        </button>
      </nav>

      {/* RIGHT: SAVE BUTTON */}
      <div className="flex flex-1 items-center justify-end gap-2">
        {isSaved && !isSaving && (
          <span
            className="hidden items-center gap-1 text-xs text-green-600 lg:flex"
            role="status"
          >
            <Check className="h-3.5 w-3.5" />
            Saved
          </span>
        )}

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || isSaved}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 sm:px-4"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}

          <span>
            {isSaving ? "Saving" : "Save"}
          </span>
        </button>
      </div>
    </header>
  );
}