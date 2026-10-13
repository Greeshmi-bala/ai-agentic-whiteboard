"use client";

import {
  useCallback,
  useEffect,
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

// ==========================================
// TYPES
// ==========================================

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

// ==========================================
// COMPONENT
// ==========================================

export default function WorkspacePage() {
  const params = useParams<{
    projectId: string | string[];
  }>();

  const router = useRouter();

  const rawProjectId = params.projectId;

  const projectId = Array.isArray(rawProjectId)
    ? rawProjectId[0]
    : rawProjectId;

  // ==========================================
  // STATE
  // ==========================================

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

  // ==========================================
  // LOAD SELECTED BOARD
  // ==========================================

  const loadWorkspace = useCallback(async () => {
    if (
      !projectId ||
      projectId === "undefined" ||
      projectId === "null"
    ) {
      setBoard(null);
      setLoadError(
        "The workspace URL does not contain a valid project ID."
      );
      setIsLoading(false);

      return;
    }

    try {
      setIsLoading(true);
      setLoadError("");

      const response = await fetch(
        `/api/boards/${encodeURIComponent(projectId)}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      // Check the response type before parsing JSON.
      const contentType =
        response.headers.get("content-type");

      if (!contentType?.includes("application/json")) {
        const responseText = await response.text();

        console.error(
          "Workspace API returned a non-JSON response:",
          response.status,
          responseText.slice(0, 300)
        );

        throw new Error(
          `Unexpected server response (HTTP ${response.status}). Check the API route.`
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

      setBoard(loadedBoard);

      setProjectName(loadedBoard.projectName);

      setWhiteboardContent(
        loadedBoard.whiteboardContent || "[]"
      );

      setDocumentContent(
        loadedBoard.documentContent || ""
      );

      setIsSaved(true);
      setLoadError("");
    } catch (error) {
      console.error("Failed to load workspace:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Failed to load workspace.";

      setBoard(null);
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // ==========================================
  // LOAD ON PAGE OPEN
  // ==========================================

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  // ==========================================
  // HANDLE WHITEBOARD CHANGES
  // ==========================================

  const handleWhiteboardChange = useCallback(
    (content: string) => {
      setWhiteboardContent(content);
      setIsSaved(false);
    },
    []
  );

  // ==========================================
  // HANDLE DOCUMENT CHANGES
  // ==========================================

  const handleDocumentChange = useCallback(
    (content: string) => {
      setDocumentContent(content);
      setIsSaved(false);
    },
    []
  );

  // ==========================================
  // SAVE WORKSPACE
  // ==========================================

  const handleSave = async () => {
    if (!board || !projectId || isSaving) {
      return;
    }

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
          body: JSON.stringify({
            projectName,
            whiteboardContent,
            documentContent,
          }),
        }
      );

      const contentType =
        response.headers.get("content-type");

      if (!contentType?.includes("application/json")) {
        const responseText = await response.text();

        console.error(
          "Workspace save returned a non-JSON response:",
          response.status,
          responseText.slice(0, 300)
        );

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

      if (data.board) {
        setBoard(data.board);
        setProjectName(data.board.projectName);
      }

      setIsSaved(true);

      toast.success("Workspace saved successfully!", {
        description:
          "Your board and document changes have been saved.",
      });
    } catch (error) {
      console.error("Failed to save workspace:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save workspace."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // LOADING SCREEN
  // ==========================================

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

  // ==========================================
  // WORKSPACE NOT FOUND / LOAD ERROR
  // ==========================================

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
              setIsLoading(true);
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

  // ==========================================
  // MAIN WORKSPACE
  // ==========================================

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-white">
      <WorkspaceHeader
        projectName={projectName}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSave={handleSave}
        isSaving={isSaving}
        isSaved={isSaved}
      />

      {/* Workspace Content */}
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