"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

import CreateNewBoardDialog from "@/components/custom/dashboard/CreateNewBoardDialog";

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

export default function ProjectList() {
  const [projectList, setProjectList] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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

      // Avoid JSON parsing errors when Next.js returns HTML.
      if (!contentType?.includes("application/json")) {
        const responseText = await response.text();

        console.error(
          "Boards API returned a non-JSON response:",
          response.status,
          responseText.slice(0, 300)
        );

        throw new Error(
          `Unable to load boards. Server returned HTTP ${response.status}.`
        );
      }

      const data =
        (await response.json()) as BoardsResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load your boards."
        );
      }

      // Validate the response before rendering.
      if (!Array.isArray(data.boards)) {
        throw new Error(
          "The server returned an invalid boards response."
        );
      }

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
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ==========================================
  // LOAD BOARDS ON MOUNT
  // ==========================================

  useEffect(() => {
    void loadBoards();

    // Refresh the board list after creating a board.
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

          return (
            <Link
              key={board.projectId}
              href={`/workspace/${encodeURIComponent(
                board.projectId
              )}`}
              aria-label={`Open workspace: ${board.projectName}`}
              className="group block rounded-xl outline-none transition-transform duration-200 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <article className="flex h-full min-h-[112px] flex-col rounded-xl border border-divider bg-white p-4 shadow-sm transition-all duration-200 group-hover:border-blue-200 group-hover:shadow-md">
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
                    <h3 className="truncate font-semibold text-navy">
                      {board.projectName}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {formattedDate}
                    </p>
                  </div>
                </div>

                {/* Board Description */}
                {board.description && (
                  <p className="line-clamp-2 text-sm leading-5 text-slate-600">
                    {board.description}
                  </p>
                )}

                {/* Open Workspace */}
                <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-xs text-slate-500">
                    Open workspace
                  </span>

                  <span
                    aria-hidden="true"
                    className="text-sm font-medium text-primary-blue transition-transform duration-200 group-hover:translate-x-1"
                  >
                    Open →
                  </span>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}