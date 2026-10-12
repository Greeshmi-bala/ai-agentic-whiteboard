"use client";

import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function WelcomeBanner() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  // Get the signed-in user's name from Clerk
  const firstName = user?.firstName;
  const fullName = user?.fullName;

  const userName = isLoaded && isSignedIn
    ? firstName || fullName || user?.username || "there"
    : "there";

  // Create a new board
  const handleCreateBoard = () => {
    router.push("/dashboard/new");
  };

  // Navigate to AI Helper
  const handleAIHelper = () => {
    router.push("/ai-helper");
  };

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-divider bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 p-6 shadow-sm sm:p-8">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        {/* Welcome Content */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            {isLoaded
              ? `Welcome Back, ${userName}`
              : "Welcome Back"}
          </h1>

          <p className="text-sm font-medium text-navy sm:text-base">
            Bring Your Ideas to Life on infinite canvas
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            {/* Create New Board */}
            <Button
              type="button"
              onClick={handleCreateBoard}
              className="gap-2 rounded-lg bg-primary-blue text-white shadow-sm hover:bg-primary-blue/90"
            >
              <Plus className="h-4 w-4" />
              Create New Board
            </Button>

            {/* AI Helper */}
            <Button
              type="button"
              variant="outline"
              onClick={handleAIHelper}
              className="gap-2 rounded-lg border-white bg-white text-navy shadow-sm hover:bg-gray-50"
            >
              <Sparkles className="h-4 w-4 text-accent-purple" />
              AI Helper
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}