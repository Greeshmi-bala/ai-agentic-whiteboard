"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";

import CreateNewBoardDialog from "@/components/custom/dashboard/CreateNewBoardDialog";

import {
  LayoutGrid,
  Users,
  Archive,
  Sparkles,
  Settings,
} from "lucide-react";

const boardItems = [
  {
    title: "All Files",
    url: "/dashboard",
    icon: LayoutGrid,
  },
  {
    title: "Shared",
    url: "/shared-files",
    icon: Users,
  },
  {
    title: "Archived",
    url: "/archived",
    icon: Archive,
  },
];

const otherItems = [
  {
    title: "AI Helper",
    url: "/ai-helper",
    icon: Sparkles,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, user } = useUser();

  const firstName = user?.firstName;
  const fullName = user?.fullName;

  const userName =
    isLoaded && isSignedIn
      ? firstName || fullName || user?.username || "User"
      : "User";

  const initials = userName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sidebar className="border-r border-divider bg-white text-navy">
      {/* Logo */}
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/logo.svg"
            alt="WhizBoard Logo"
            width={40}
            height={40}
            priority
          />

          <h2 className="text-xl font-bold tracking-tight text-navy">
            WhizBoard
          </h2>
        </Link>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent>
        {/* Top Create New Board */}
        <SidebarGroup className="px-3 py-2">
          <CreateNewBoardDialog />
        </SidebarGroup>

        {/* My Boards */}
        <SidebarGroup className="px-3 py-2">
          <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium text-slate">
            My Boards
          </SidebarGroupLabel>

          <div className="space-y-1">
            {boardItems.map((item) => {
              const isActive =
                item.url === "/dashboard"
                  ? pathname === "/dashboard" ||
                    pathname.startsWith("/dashboard/")
                  : pathname === item.url ||
                    pathname.startsWith(`${item.url}/`);

              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  href={item.url}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm transition-colors ${
                    isActive
                      ? "bg-sidebar-active text-primary-blue"
                      : "text-navy hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
        </SidebarGroup>

        {/* Others */}
        <SidebarGroup className="px-3 py-2">
          <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium text-slate">
            Others
          </SidebarGroupLabel>

          <div className="space-y-1">
            {otherItems.map((item) => {
              const isActive =
                pathname === item.url ||
                pathname.startsWith(`${item.url}/`);

              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  href={item.url}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm transition-colors ${
                    isActive
                      ? "bg-sidebar-active text-primary-blue"
                      : "text-navy hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
        </SidebarGroup>
      </SidebarContent>

      {/* Bottom Section */}
      <SidebarFooter className="mt-auto gap-3 p-3">
        {/* Bottom Create New Board */}
        <CreateNewBoardDialog />

        {/* File Usage */}
        <div className="rounded-xl border border-divider bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-navy">
              2 files created
            </span>

            <span className="text-slate">total 3</span>
          </div>

          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
            role="progressbar"
            aria-label="File creation progress"
            aria-valuenow={2}
            aria-valuemin={0}
            aria-valuemax={3}
          >
            <div
              className="h-full rounded-full bg-primary-blue transition-all duration-300"
              style={{ width: `${(2 / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 rounded-xl border border-divider bg-white p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-900 text-sm font-semibold text-white">
            {initials || "U"}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-navy">
              {userName}
            </p>

            <p className="text-xs text-slate">
              Personal Workspace
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}