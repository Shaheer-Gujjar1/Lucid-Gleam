import { Users, ClipboardList, LayoutDashboard, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

type View = 'dashboard' | 'students' | 'tasks' | 'grades';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const navItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'students' as const, label: 'Students', icon: Users },
  { id: 'tasks' as const, label: 'Tasks', icon: ClipboardList },
  { id: 'grades' as const, label: 'Grades', icon: GraduationCap },
];

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <GraduationCap className="h-8 w-8 text-sidebar-primary" />
        <span className="text-xl font-bold text-sidebar-foreground">TeacherDesk</span>
      </div>
      <nav className="space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
