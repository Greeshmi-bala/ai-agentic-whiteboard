"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProjectList() {
  const [projectList] = useState<string[]>([]);
  const router = useRouter();

  const handleCreateBoard = () => {
    router.push("/dashboard/new");
  };

  return (
    <section className="w-full">
      {projectList.length === 0 ? (
        /* Empty State */
        <div className="flex min-h-[268px] w-full flex-col items-center justify-center rounded-2xl border border-divider bg-white px-6 py-8 text-center shadow-sm">
          {/* Folder Image */}
          <Image
            src="/folder.png"
            alt="Folder"
            width={80}
            height={80}
            priority
            className="mb-3 h-20 w-20 object-contain"
          />

          {/* Empty State Heading */}
          <h2 className="text-xl font-bold text-navy">
            No Boards Found
          </h2>

          {/* Empty State Description */}
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate">
            Create your first board to start brainstorming, Planning !
          </p>

          {/* Create New Board Button */}
          <Button
            type="button"
            onClick={handleCreateBoard}
            className="mt-3 h-9 gap-2 rounded-lg bg-primary-blue px-4 text-sm text-white hover:bg-primary-blue/90"
          >
            <Plus className="h-4 w-4" />
            Create New Board
          </Button>
        </div>
      ) : (
        /* Project List */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectList.map((project, index) => (
            <div
              key={`${project}-${index}`}
              className="rounded-xl border border-divider bg-white p-4 shadow-sm"
            >
              {project}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}