import React from "react";

import { AppSidebar } from "@/components/custom/dashboard/AppSideBar";
import AppHeader from "@/components/custom/dashboard/AppHeader";

import { SidebarProvider } from "@/components/ui/sidebar";

function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Dashboard Layout */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-page">
        {/* Dashboard Header */}
        <AppHeader />

        {/* Dashboard Page Content */}
        <main className="flex-1 p-4">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

export default DashboardLayout;