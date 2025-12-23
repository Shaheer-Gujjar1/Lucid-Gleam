import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { StudentList } from "@/components/students/StudentList";
import { TaskList } from "@/components/tasks/TaskList";
import { GradeBook } from "@/components/grades/GradeBook";

type View = "dashboard" | "students" | "tasks" | "grades";

const Index = () => {
  const [currentView, setCurrentView] = useState<View>("dashboard");

  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard />;
      case "students":
        return <StudentList />;
      case "tasks":
        return <TaskList />;
      case "grades":
        return <GradeBook />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="ml-64 min-h-screen p-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;
