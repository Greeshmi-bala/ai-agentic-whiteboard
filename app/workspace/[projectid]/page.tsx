"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Loader2,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

import WorkspaceHeader from "@/components/custom/workspace/workspaceHeader";
import WhiteBoard from "@/components/custom/workspace/whiteBoard";
import SmartDoc from "@/components/custom/workspace/smartDoc";

// ==================================================
// TYPES
// ==================================================

interface Board {
  id: number;
  projectId: string;
  projectName: string;
  description: string | null;
  userEmail: string;
  whiteboardContent: string;
  documentContent: string;
  createdAt: string;
  updatedAt?: string | null;
}

interface BoardResponse {
  success?: boolean;
  error?: string;
  message?: string;
  board?: Board;
}

type WorkspaceTab = "whiteboard" | "doc";

// ==================================================
// WORKSPACE PAGE
// ==================================================

export default function WorkspacePage() {
  const params = useParams<{
    projectid?: string | string[];
    projectId?: string | string[];
  }>();

  const router = useRouter();

  const rawProjectId =
    params.projectid ?? params.projectId;

  const projectId = Array.isArray(rawProjectId)
    ? rawProjectId[0]
    : rawProjectId;

  // ==================================================
  // STATE
  // ==================================================

  const [board, setBoard] = useState<Board | null>(null);

  const [projectName, setProjectName] = useState("");

  const [whiteboardContent, setWhiteboardContent] =
    useState("[]");

  const [documentContent, setDocumentContent] =
    useState("");

  const [activeTab, setActiveTab] =
    useState<WorkspaceTab>("whiteboard");

  const [isLoading, setIsLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const [isSaved, setIsSaved] = useState(true);

  const [loadError, setLoadError] = useState("");

  // ==================================================
  // REFS
  // ==================================================

  const autosaveTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveInProgressRef = useRef(false);

  const dirtyRef = useRef(false);

  const mountedRef = useRef(false);

  const latestContentRef = useRef({
    projectName: "",
    whiteboardContent: "[]",
    documentContent: "",
  });

  const savedContentRef = useRef({
    projectName: "",
    whiteboardContent: "[]",
    documentContent: "",
  });

  // Keep the latest content available to the save function.
  useEffect(() => {
    latestContentRef.current = {
      projectName,
      whiteboardContent,
      documentContent,
    };
  }, [
    projectName,
    whiteboardContent,
    documentContent,
  ]);

  // ==================================================
  // CLEAR AUTOSAVE TIMER
  // ==================================================

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  // ==================================================
  // LOAD WORKSPACE
  // ==================================================

  const loadWorkspace = useCallback(async () => {
    const validProjectId = projectId?.trim();

    if (
      !validProjectId ||
      validProjectId === "undefined" ||
      validProjectId === "null"
    ) {
      setBoard(null);
      setLoadError(
        "The workspace URL does not contain a valid project ID."
      );
      setIsLoading(false);
      return;
    }

    clearAutosaveTimer();

    setIsLoading(true);
    setLoadError("");

    dirtyRef.current = false;

    try {
      const response = await fetch(
        `/api/boards/${encodeURIComponent(validProjectId)}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const contentType =
        response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/json")) {
        throw new Error(
          `Unexpected server response (HTTP ${response.status}).`
        );
      }

      const data =
        (await response.json()) as BoardResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load this workspace."
        );
      }

      if (!data.board) {
        throw new Error(
          "The server did not return the requested workspace."
        );
      }

      const loadedBoard = data.board;

      if (loadedBoard.projectId !== validProjectId) {
        throw new Error(
          "The returned workspace ID does not match the requested project."
        );
      }

      const loadedContent = {
        projectName: loadedBoard.projectName,
        whiteboardContent:
          loadedBoard.whiteboardContent || "[]",
        documentContent:
          loadedBoard.documentContent || "",
      };

      setBoard(loadedBoard);
      setProjectName(loadedContent.projectName);
      setWhiteboardContent(
        loadedContent.whiteboardContent
      );
      setDocumentContent(
        loadedContent.documentContent
      );

      latestContentRef.current = loadedContent;
      savedContentRef.current = loadedContent;

      dirtyRef.current = false;

      setIsSaved(true);
      setLoadError("");
    } catch (error) {
      console.error("Failed to load workspace:", error);

      setBoard(null);

      setLoadError(
        error instanceof Error
          ? error.message
          : "Failed to load workspace."
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId, clearAutosaveTimer]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      clearAutosaveTimer();
    };
  }, [clearAutosaveTimer]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  // ==================================================
  // SAVE WORKSPACE
  // ==================================================

  const handleSave = useCallback(
    async (showToast = true): Promise<boolean> => {
      if (!board || !projectId) {
        return false;
      }

      // Prevent simultaneous requests.
      if (saveInProgressRef.current) {
        return false;
      }

      const snapshot = {
        ...latestContentRef.current,
      };

      const saved = savedContentRef.current;

      const hasChanges =
        snapshot.projectName !== saved.projectName ||
        snapshot.whiteboardContent !==
          saved.whiteboardContent ||
        snapshot.documentContent !==
          saved.documentContent;

      if (!hasChanges) {
        dirtyRef.current = false;
        setIsSaved(true);
        return true;
      }

      saveInProgressRef.current = true;

      clearAutosaveTimer();
      setIsSaving(true);

      try {
        const response = await fetch(
          `/api/boards/${encodeURIComponent(projectId)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(snapshot),
          }
        );

        const contentType =
          response.headers.get("content-type") ?? "";

        if (!contentType.includes("application/json")) {
          throw new Error(
            `Unexpected server response (HTTP ${response.status}).`
          );
        }

        const data =
          (await response.json()) as BoardResponse;

        if (!response.ok) {
          throw new Error(
            data.error || "Failed to save workspace."
          );
        }

        if (!data.board) {
          throw new Error(
            "The server did not return the saved workspace."
          );
        }

        savedContentRef.current = snapshot;

        if (mountedRef.current) {
          setBoard(data.board);
        }

        const latest = latestContentRef.current;

        // Changes might have happened while the request
        // was in progress. Do not mark those changes saved.
        const hasNewerChanges =
          latest.projectName !== snapshot.projectName ||
          latest.whiteboardContent !==
            snapshot.whiteboardContent ||
          latest.documentContent !==
            snapshot.documentContent;

        dirtyRef.current = hasNewerChanges;

        if (mountedRef.current) {
          setIsSaved(!hasNewerChanges);
        }

        if (showToast) {
          toast.success("Changes saved successfully!", {
            description:
              "Your latest workspace changes have been saved.",
          });
        }

        return true;
      } catch (error) {
        console.error("Failed to save workspace:", error);

        dirtyRef.current = true;

        if (mountedRef.current) {
          setIsSaved(false);
        }

        if (showToast) {
          toast.error("Failed to save changes", {
            description:
              error instanceof Error
                ? error.message
                : "Please try again.",
          });
        }

        return false;
      } finally {
        saveInProgressRef.current = false;

        if (mountedRef.current) {
          setIsSaving(false);
        }

        // If changes arrived while saving, schedule another
        // save instead of losing the latest edits.
        if (dirtyRef.current && mountedRef.current) {
          clearAutosaveTimer();

          autosaveTimerRef.current = setTimeout(() => {
            void handleSave(true);
          }, 10_000);
        }
      }
    },
    [
      board,
      projectId,
      clearAutosaveTimer,
    ]
  );

  // ==================================================
  // HANDLE WHITEBOARD CHANGES
  // ==================================================

  const handleWhiteboardChange = useCallback(
    (content: string) => {
      setWhiteboardContent(content);

      latestContentRef.current = {
        ...latestContentRef.current,
        whiteboardContent: content,
      };

      dirtyRef.current = true;
      setIsSaved(false);
    },
    []
  );

  // ==================================================
  // HANDLE DOCUMENT CHANGES
  // ==================================================

  const handleDocumentChange = useCallback(
    (content: string) => {
      setDocumentContent(content);

      latestContentRef.current = {
        ...latestContentRef.current,
        documentContent: content,
      };

      dirtyRef.current = true;
      setIsSaved(false);
    },
    []
  );

  // ==================================================
  // HANDLE PROJECT NAME CHANGES
  // ==================================================

  const handleProjectNameChange = useCallback(
    (name: string) => {
      setProjectName(name);

      latestContentRef.current = {
        ...latestContentRef.current,
        projectName: name,
      };

      dirtyRef.current = true;
      setIsSaved(false);
    },
    []
  );

  // ==================================================
  // AUTOSAVE EVERY 10 SECONDS AFTER CHANGES
  // ==================================================

  useEffect(() => {
    clearAutosaveTimer();

    if (!board || isLoading || !dirtyRef.current) {
      return;
    }

    autosaveTimerRef.current = setTimeout(() => {
      void handleSave(true);
    }, 10_000);

    return () => {
      clearAutosaveTimer();
    };
  }, [
    board,
    isLoading,
    whiteboardContent,
    documentContent,
    projectName,
    handleSave,
    clearAutosaveTimer,
  ]);

  // ==================================================
  // LOADING SCREEN
  // ==================================================

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          </div>

          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Opening your workspace
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Loading your saved board...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ==================================================
  // WORKSPACE NOT FOUND
  // ==================================================

  if (!board) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
          <Image
            src="/folder.png"
            alt="Workspace folder"
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
          />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-gray-900">
          Workspace not found
        </h1>

        <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
          {loadError ||
            "This workspace may have been deleted or you may not have permission to access it."}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <button
            type="button"
            onClick={() => {
              void loadWorkspace();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </main>
    );
  }

  // ==================================================
  // MAIN WORKSPACE
  // ==================================================

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-white">
      <WorkspaceHeader
        projectName={projectName}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSave={() => {
          void handleSave(true);
        }}
        isSaving={isSaving}
        isSaved={isSaved}
      />

      <section className="min-h-0 flex-1 overflow-hidden bg-white">
        {activeTab === "whiteboard" ? (
          <WhiteBoard
            key={`${board.projectId}-whiteboard`}
            initialContent={whiteboardContent}
            onChange={handleWhiteboardChange}
          />
        ) : (
          <SmartDoc
            key={`${board.projectId}-document`}
            initialContent={documentContent}
            onChange={handleDocumentChange}
          />
        )}
      </section>
    </main>
  );
}