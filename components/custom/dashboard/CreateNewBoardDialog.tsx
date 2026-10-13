"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Plus, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CreateNewBoardDialogProps {
  children?: ReactNode;
  className?: string;
}

export default function CreateNewBoardDialog({
  children,
  className,
}: CreateNewBoardDialogProps) {
  const [open, setOpen] = useState(false);

  const [boardName, setBoardName] = useState("");
  const [boardDescription, setBoardDescription] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreateBoard = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const trimmedName = boardName.trim();
    const trimmedDescription = boardDescription.trim();

    if (!trimmedName) {
      setError("Please enter a board name.");
      toast.error("Board name is required.");
      return;
    }

    setError("");
    setIsCreating(true);

    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName: trimmedName,
          description: trimmedDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create the board."
        );
      }

      if (!data.board) {
        throw new Error(
          "The server did not return the saved board."
        );
      }

      // Notify mounted board lists to fetch the saved records.
      window.dispatchEvent(
        new CustomEvent("boards:updated")
      );

      // Close the modal only after a successful database save.
      setOpen(false);

      // Reset form.
      setBoardName("");
      setBoardDescription("");
      setError("");

      // Show success notification.
      toast.success("Board created successfully!", {
        description: `"${data.board.projectName}" has been saved.`,
      });
    } catch (err) {
      console.error("Failed to create board:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";

      setError(message);

      toast.error("Unable to create board", {
        description: message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (isCreating) return;

    setOpen(nextOpen);

    if (!nextOpen) {
      setError("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Reusable trigger: sidebar and dashboard */}
      <DialogTrigger
        render={
          <button
            type="button"
            className={
              className ??
              "flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-blue px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-blue/90"
            }
          />
        }
      >
        {children ?? (
          <>
            <Plus className="h-4 w-4" />
            <span>Create New Board</span>
          </>
        )}
      </DialogTrigger>

      {/* Centered Modal */}
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-navy shadow-2xl sm:p-7">
        <form onSubmit={handleCreateBoard}>
          <DialogHeader className="space-y-3 text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-purple-100">
              <Sparkles className="h-5 w-5 text-primary-blue" />
            </div>

            <DialogTitle className="text-xl font-bold tracking-tight text-navy">
              Create a New Board
            </DialogTitle>

            <DialogDescription className="text-sm leading-6 text-slate-500">
              Give your ideas a place to grow. Create a board for
              brainstorming, planning, diagrams, and creative projects.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-5">
            {/* Board Name */}
            <div className="space-y-2">
              <Label
                htmlFor="board-name"
                className="text-sm font-medium text-navy"
              >
                Board Name <span className="text-red-500">*</span>
              </Label>

              <Input
                id="board-name"
                name="boardName"
                placeholder="e.g. Website Redesign"
                value={boardName}
                onChange={(event) => {
                  setBoardName(event.target.value);
                  setError("");
                }}
                maxLength={255}
                autoFocus
                className="h-11 rounded-lg border-gray-200 bg-white focus-visible:ring-primary-blue"
                aria-invalid={Boolean(error)}
                aria-describedby={
                  error ? "board-name-error" : undefined
                }
              />

              <div className="flex justify-between text-xs text-slate-400">
                <span>Choose a name for your workspace.</span>
                <span>{boardName.length}/255</span>
              </div>
            </div>

            {/* Board Description */}
            <div className="space-y-2">
              <Label
                htmlFor="board-description"
                className="text-sm font-medium text-navy"
              >
                Description{" "}
                <span className="font-normal text-slate-400">
                  (Optional)
                </span>
              </Label>

              <Textarea
                id="board-description"
                name="boardDescription"
                placeholder="What would you like to work on?"
                value={boardDescription}
                onChange={(event) =>
                  setBoardDescription(event.target.value)
                }
                maxLength={500}
                rows={3}
                className="resize-none rounded-lg border-gray-200 bg-white focus-visible:ring-primary-blue"
              />

              <div className="text-right text-xs text-slate-400">
                {boardDescription.length}/500
              </div>
            </div>

            {/* Inline Error */}
            {error && (
              <p
                id="board-name-error"
                role="alert"
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
              >
                {error}
              </p>
            )}
          </div>

          {/* Modal Actions */}
          <DialogFooter className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isCreating}
              className="rounded-lg border-gray-200 bg-white text-navy hover:bg-gray-50"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isCreating || !boardName.trim()}
              className="gap-2 rounded-lg bg-primary-blue text-white shadow-sm hover:bg-primary-blue/90"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Board
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}