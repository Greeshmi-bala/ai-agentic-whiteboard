"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserButton } from "@clerk/nextjs";

function AppHeader() {
  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-divider bg-white px-4">
      {/* Sidebar Toggle */}
      <SidebarTrigger />

      {/* User Profile */}
      <UserButton />
    </header>
  );
}

export default AppHeader;