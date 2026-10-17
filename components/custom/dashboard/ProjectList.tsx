"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import CreateNewBoardDialog from "@/components/custom/dashboard/CreateNewBoardDialog";

// ==========================================
// TYPES
// ==========================================

interface Board {
  id: number;
  projectId: string;
  projectName: string;
  description: string | null;
  userEmail: string;
  createdAt: string;
}

interface BoardsResponse {
  success?: boolean;
  boards?: Board[];
  error?: string;
}

interface DeleteBoardResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

// ==========================================
// PROJECT LIST COMPONENT
// ==========================================

export default function ProjectList() {
  const [projectList, setProjectList] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(
    null
  );

  // ==========================================
  // LOAD BOARDS FROM THE DATABASE
  // ==========================================

  const loadBoards = useCallback(async () => {
    try {
      setError("");

      const response = await fetch("/api/boards", {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      const contentType =
        response.headers.get("content-type");

      // Handle non-JSON responses safely.
      if (!contentType?.includes("application/json")) {
        const responseText = await response.text();

        console.error(
          "Boards API returned a non-JSON response:",
          response.status,
          responseText.slice(0, 300)
        );

        throw new Error(
          `Unable to load boards. Server returned HTTP ${response.status}. Check app/api/boards/route.ts.`
        );
      }

      const data =
        (await response.json()) as BoardsResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load your boards."
        );
      }

      if (!Array.isArray(data.boards)) {
        throw new Error(
          "The server returned an invalid boards response."
        );
      }

      // Validate the returned board data.
      const validBoards = data.boards.filter(
        (board) =>
          typeof board.projectId === "string" &&
          board.projectId.trim().length > 0 &&
          typeof board.projectName === "string"
      );

      setProjectList(validBoards);
    } catch (err) {
      console.error("Failed to load boards:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Unable to load your boards.";

      setError(message);
      toast.error("Unable to load boards", {
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ==========================================
  // LOAD BOARDS ON MOUNT
  // ==========================================

  useEffect(() => {
    void loadBoards();

    // Refresh when another component creates or updates a board.
    const handleBoardsUpdated = () => {
      void loadBoards();
    };

    window.addEventListener(
      "boards:updated",
      handleBoardsUpdated
    );

    return () => {
      window.removeEventListener(
        "boards:updated",
        handleBoardsUpdated
      );
    };
  }, [loadBoards]);

  // ==========================================
  // PERFORM DATABASE DELETION
  // ==========================================

  const performDeleteBoard = async (
    projectId: string,
    projectName: string
  ) => {
    if (deletingBoardId) {
      return;
    }

    const loadingToastId = toast.loading(
      `Deleting "${projectName}"...`,
      {
        description: "Removing the board from your database.",
      }
    );

    setDeletingBoardId(projectId);

    try {
      const response = await fetch(
        `/api/boards/${encodeURIComponent(projectId)}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const contentType =
        response.headers.get("content-type");

      if (!contentType?.includes("application/json")) {
        const responseText = await response.text();

        console.error(
          "Delete API returned a non-JSON response:",
          response.status,
          responseText.slice(0, 300)
        );

        throw new Error(
          `Delete request failed with HTTP ${response.status}. Check app/api/boards/[projectid]/route.ts.`
        );
      }

      const data =
        (await response.json()) as DeleteBoardResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to delete the board."
        );
      }

      // Remove the board only after the API confirms
      // that the database deletion succeeded.
      setProjectList((currentBoards) =>
        currentBoards.filter(
          (board) => board.projectId !== projectId
        )
      );

      toast.dismiss(loadingToastId);

      toast.success("Board deleted successfully", {
        description: `"${projectName}" has been permanently deleted.`,
        duration: 4000,
      });

      // Notify other dashboard components.
      window.dispatchEvent(
        new CustomEvent("boards:updated")
      );
    } catch (err) {
      console.error("Failed to delete board:", err);

      toast.dismiss(loadingToastId);

      toast.error("Unable to delete board", {
        description:
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
        duration: 5000,
      });
    } finally {
      setDeletingBoardId(null);
    }
  };

  // ==========================================
  // TOAST CONFIRMATION BEFORE DELETION
  // ==========================================

  const handleDeleteBoard = (
    projectId: string,
    projectName: string
  ) => {
    if (deletingBoardId) {
      return;
    }

    const confirmationToastId = toast.warning(
      `Delete "${projectName}"?`,
      {
        description:
          "This permanently removes the board and its saved content. This action cannot be undone.",
        duration: 10000,

        action: {
          label: "Delete",
          onClick: () => {
            toast.dismiss(confirmationToastId);

            void performDeleteBoard(
              projectId,
              projectName
            );
          },
        },

        cancel: {
          label: "Cancel",
          onClick: () => {
            toast.dismiss(confirmationToastId);

            toast.info("Deletion cancelled", {
              description:
                `"${projectName}" has not been deleted.`,
              duration: 2500,
            });
          },
        },
      }
    );
  };

  // ==========================================
  // RETRY LOADING
  // ==========================================

  const handleRetry = () => {
    setIsLoading(true);
    void loadBoards();
  };

  // ==========================================
  // LOADING STATE
  // ==========================================

  if (isLoading) {
    return (
      <section className="w-full">
        <div className="flex min-h-[268px] items-center justify-center rounded-2xl border border-divider bg-white shadow-sm">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />

            <span>Loading your boards...</span>
          </div>
        </div>
      </section>
    );
  }

  // ==========================================
  // ERROR STATE
  // ==========================================

  if (error) {
    return (
      <section className="w-full">
        <div className="flex min-h-[268px] flex-col items-center justify-center rounded-2xl border border-divider bg-white px-6 py-8 text-center shadow-sm">
          <Image
            src="/folder.png"
            alt="Folder"
            width={64}
            height={64}
            className="mb-4 h-16 w-16 object-contain"
          />

          <h2 className="text-lg font-semibold text-navy">
            Unable to Load Boards
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={handleRetry}
            className="mt-5 rounded-lg bg-primary-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-blue/90"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  // ==========================================
  // EMPTY STATE
  // ==========================================

  if (projectList.length === 0) {
    return (
      <section className="w-full">
        <div className="flex min-h-[268px] w-full flex-col items-center justify-center rounded-2xl border border-divider bg-white px-6 py-8 text-center shadow-sm">
          <Image
            src="/folder.png"
            alt="Empty folder"
            width={80}
            height={80}
            priority
            className="mb-3 h-20 w-20 object-contain"
          />

          <h2 className="text-xl font-bold text-navy">
            No Boards Found
          </h2>

          <p className="mt-2 max-w-lg text-sm leading-6 text-slate">
            Create your first board to start brainstorming and planning!
          </p>

          <CreateNewBoardDialog
            className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg bg-primary-blue px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-blue/90"
          />
        </div>
      </section>
    );
  }

  // ==========================================
  // SAVED BOARDS
  // ==========================================

  return (
    <section className="w-full">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projectList.map((board) => {
          const formattedDate = board.createdAt
            ? new Date(board.createdAt).toLocaleDateString()
            : "";

          const isDeleting =
            deletingBoardId === board.projectId;

          return (
            <article
              key={board.projectId}
              className="group flex min-w-0 flex-col rounded-xl border border-divider bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
            >
              {/* Board Header */}

              <div className="mb-3 flex items-start gap-3">
                <Image
                  src="/folder.png"
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 object-contain"
                />

                <div className="min-w-0 flex-1">
                  <h3
                    className="truncate font-semibold text-navy"
                    title={board.projectName}
                  >
                    {board.projectName}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {formattedDate}
                  </p>
                </div>
              </div>

              {/* Board Description */}

              <div className="mb-4 min-h-5">
                {board.description && (
                  <p className="line-clamp-2 text-sm leading-5 text-slate-600">
                    {board.description}
                  </p>
                )}
              </div>

              {/* Board Actions */}

              <div className="mt-auto flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                <Link
                  href={`/workspace/${encodeURIComponent(
                    board.projectId
                  )}`}
                  aria-label={`Open workspace: ${board.projectName}`}
                  className="inline-flex min-w-0 items-center gap-1 text-sm font-medium text-primary-blue transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <span className="truncate">
                    Open workspace
                  </span>

                  <span aria-hidden="true">→</span>
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    handleDeleteBoard(
                      board.projectId,
                      board.projectName
                    )
                  }
                  disabled={Boolean(deletingBoardId)}
                  aria-label={`Delete ${board.projectName}`}
                  title="Delete board"
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}

                  <span>
                    {isDeleting ? "Deleting..." : "Delete"}
                  </span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}