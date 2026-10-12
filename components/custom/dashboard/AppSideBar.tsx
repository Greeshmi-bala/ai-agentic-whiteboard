"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";

import {
  Plus,
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

  return (
    <Sidebar className="border-r border-divider bg-white text-navy">

      {/* Logo and Brand Name */}
      <SidebarHeader className="p-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2"
        >
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

      {/* Main Sidebar Content */}
      <SidebarContent>

        {/* Top Create New Board Button */}
        <SidebarGroup className="px-3 py-2">
          <Button
            type="button"
            className="h-10 w-full justify-center gap-2 rounded-lg bg-primary-blue text-white hover:bg-primary-blue/90"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Board</span>
          </Button>
        </SidebarGroup>

        {/* My Boards */}
        <SidebarGroup className="px-3 py-2">
          <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium text-slate">
            My Boards
          </SidebarGroupLabel>

          <div className="space-y-1">
            {boardItems.map((item) => {
              const isActive = pathname === item.url;
              const Icon = item.icon;

              return (
                <SidebarMenuButton
                  key={item.title}
                  isActive={isActive}
                  className={`h-10 w-full rounded-lg px-3 ${
                    isActive
                      ? "bg-sidebar-active text-primary-blue hover:bg-sidebar-active hover:text-primary-blue"
                      : "text-navy hover:bg-gray-100"
                  }`}
                >
                  <Link
                    href={item.url}
                    className="flex h-full w-full items-center gap-2"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
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
              const isActive = pathname === item.url;
              const Icon = item.icon;

              return (
                <SidebarMenuButton
                  key={item.title}
                  isActive={isActive}
                  className={`h-10 w-full rounded-lg px-3 ${
                    isActive
                      ? "bg-sidebar-active text-primary-blue hover:bg-sidebar-active hover:text-primary-blue"
                      : "text-navy hover:bg-gray-100"
                  }`}
                >
                  <Link
                    href={item.url}
                    className="flex h-full w-full items-center gap-2"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              );
            })}
          </div>
        </SidebarGroup>

      </SidebarContent>

      {/* Bottom Section */}
      <SidebarFooter className="mt-auto gap-3 p-3">

        {/* Bottom Create New Board Button */}
        <Button
          type="button"
          className="h-10 w-full justify-center gap-2 rounded-lg bg-primary-blue text-white hover:bg-primary-blue/90"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Board</span>
        </Button>

        {/* File Usage Card */}
        <div className="rounded-xl border border-divider bg-white p-3">

          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-navy">
              2 files created
            </span>

            <span className="text-slate">
              total 3
            </span>
          </div>

          {/* Progress Bar */}
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

      </SidebarFooter>
    </Sidebar>
  );
}