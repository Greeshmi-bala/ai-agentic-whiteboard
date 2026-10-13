"use client";

import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Lightbulb, Brain, ArrowRight } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function WelcomeBanner() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  // Get the signed-in user's name from Clerk
  const firstName = user?.firstName;
  const fullName = user?.fullName;

  const userName =
    isLoaded && isSignedIn
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
    <section className="relative mb-8 overflow-hidden rounded-2xl border border-divider bg-gradient-to-r from-purple-50 via-white to-blue-50 p-6 shadow-sm sm:p-8">
      {/* Subtle background decorations */}
      <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-purple-200/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/3 h-32 w-32 rounded-full bg-blue-200/20 blur-3xl" />

      <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
        {/* Left: Welcome Content */}
        <div className="min-w-0 flex-1 space-y-2">
          {/* Small label */}
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-purple-700 sm:text-sm">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span>Your creative workspace</span>
          </div>

          {/* Welcome heading */}
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {userName}
            </span>
            <span className="ml-1 inline-block">👋</span>
          </h1>

          {/* Description */}
          <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Turn your ideas into diagrams, notes and visuals on an infinite
            canvas.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            {/* Create New Board */}
            <Button
              type="button"
              onClick={handleCreateBoard}
              className="gap-2 rounded-lg bg-primary-blue text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-blue/90 hover:shadow-md"
            >
              Create New Board
              <ArrowRight className="h-4 w-4" />
            </Button>

            {/* AI Helper */}
            <Button
              type="button"
              variant="outline"
              onClick={handleAIHelper}
              className="gap-2 rounded-lg border-slate-200 bg-white text-navy shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-200 hover:bg-purple-50 hover:shadow-md"
            >
              <Sparkles className="h-4 w-4 text-purple-600" />
              Ask AI
            </Button>
          </div>
        </div>

        {/* Right: Creative Workspace Illustration */}
        <div className="flex shrink-0 items-center justify-center lg:justify-end">
          <div className="w-full max-w-[250px] rounded-2xl border border-white/80 bg-white/90 p-3.5 shadow-lg shadow-indigo-100/60 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl sm:w-[220px]">
            {/* Window Header */}
            <div className="mb-4 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              <span className="h-2 w-2 rounded-full bg-green-400" />
            </div>

            {/* Idea Cards */}
            <div className="flex items-center justify-center gap-2">
              {/* New Idea */}
              <div className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-100 to-yellow-100 px-3 py-2 text-[11px] font-semibold text-amber-900 shadow-sm">
                <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                <span>New Idea</span>
                <Sparkles className="h-3 w-3 text-amber-500" />
              </div>

              {/* AI Brainstorm */}
              <div className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-100 to-indigo-100 px-3 py-2 text-[11px] font-semibold text-purple-900 shadow-sm">
                <Brain className="h-3.5 w-3.5 text-purple-600" />
                <span>AI Brainstorm</span>
              </div>
            </div>

            {/* Workflow Badge */}
            <div className="mt-3 flex justify-center">
              <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 text-[10px] font-semibold text-slate-700">
                <span>Design</span>
                <ArrowRight className="h-3 w-3 text-blue-500" />
                <span>Build</span>
                <ArrowRight className="h-3 w-3 text-blue-500" />
                <span>Ship</span>
              </div>
            </div>

            {/* Decorative bottom line */}
            <div className="mt-4 flex justify-center">
              <div className="h-1 w-12 rounded-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}