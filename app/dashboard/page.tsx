import WelcomeBanner from "@/components/custom/dashboard/WelcomeBanner";
import ProjectList from "@/components/custom/dashboard/ProjectList";

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-4">
      {/* Welcome Banner */}
      <WelcomeBanner />

      {/* Project List */}
      <ProjectList />
    </div>
  );
}