"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Image from "next/image";

import CreateNewBoardDialog from "@/components/custom/dashboard/CreateNewBoardDialog";

interface Board {
  id: number;
  projectId: string;
  projectName: string;
  description: string | null;
  userEmail: string;
  createdAt: string;
}

export default function ProjectList() {
  const [projectList, setProjectList] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBoards = useCallback(async () => {
    try {
      setError("");

      const response = await fetch("/api/boards", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load boards."
        );
      }

      setProjectList(data.boards ?? []);
    } catch (err) {
      console.error("Failed to load boards:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load boards."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBoards();

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

  return (
    <section className="w-full">
      {/* Loading State */}
      {isLoading ? (
        <div className="flex min-h-[268px] items-center justify-center rounded-2xl border border-divider bg-white shadow-sm">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Loading your boards...
          </div>
        </div>
      ) : error ? (
        /* Error State */
        <div className="flex min-h-[268px] flex-col items-center justify-center rounded-2xl border border-divider bg-white px-6 py-8 text-center shadow-sm">
          <p className="text-sm text-red-600">{error}</p>

          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              void loadBoards();
            }}
            className="mt-4 rounded-lg bg-primary-blue px-4 py-2 text-sm text-white hover:bg-primary-blue/90"
          >
            Try Again
          </button>
        </div>
      ) : projectList.length === 0 ? (
        /* Empty State */
        <div className="flex min-h-[268px] w-full flex-col items-center justify-center rounded-2xl border border-divider bg-white px-6 py-8 text-center shadow-sm">
          <Image
            src="/folder.png"
            alt="Folder"
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
      ) : (
        /* Saved Boards */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectList.map((board) => (
            <article
              key={board.projectId}
              className="group rounded-xl border border-divider bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-3 flex items-start gap-3">
                <Image
                  src="/folder.png"
                  alt="Board"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                />

                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-navy">
                    {board.projectName}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(board.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {board.description && (
                <p className="line-clamp-2 text-sm text-slate-600">
                  {board.description}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}