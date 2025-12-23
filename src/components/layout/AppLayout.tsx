import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet, Link } from "react-router-dom";
import { GraduationCap, Bell, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md shadow-sm">
            <div className="flex h-16 items-center justify-between gap-4 px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
                <Link to="/" className="flex items-center gap-3 group">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md group-hover:shadow-lg transition-all duration-300">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-xl font-bold text-foreground tracking-tight">Lucid Gleam</h1>
                    <p className="text-xs text-muted-foreground -mt-0.5">Teacher's Desk</p>
                  </div>
                </Link>
              </div>

              <div className="flex-1 max-w-md hidden md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search students, classes, tasks..." 
                    className="pl-10 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Settings className="h-5 w-5" />
                </Button>
                <div className="hidden sm:flex items-center gap-3 ml-2 pl-4 border-l border-border">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent-foreground flex items-center justify-center text-primary-foreground font-semibold text-sm shadow-md">
                    T
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-sm font-medium text-foreground">Teacher</p>
                    <p className="text-xs text-muted-foreground">Admin</p>
                  </div>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 bg-background overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
