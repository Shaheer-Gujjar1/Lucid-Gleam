import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { GraduationCap, Bell, Search, Settings, User, LogOut, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useState, useEffect } from "react";
import { getAllClasses, getAllStudents } from "@/lib/db";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function AppLayout() {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [classesData, studentsData] = await Promise.all([
        getAllClasses(),
        getAllStudents()
      ]);
      setClasses(classesData);
      setStudents(studentsData);
    };
    loadData();
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const notifications = [
    { id: 1, title: "Assignment due tomorrow", description: "Math Quiz - Class 10A", time: "2 hours ago" },
    { id: 2, title: "New student enrolled", description: "John Doe joined Class 9B", time: "5 hours ago" },
    { id: 3, title: "Grade report ready", description: "Monthly report for October", time: "1 day ago" },
  ];

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
                <div 
                  className="relative cursor-pointer"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search... (⌘K)" 
                    className="pl-10 bg-background/50 border-border/50 focus:border-primary/50 transition-colors cursor-pointer"
                    readOnly
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Notifications Popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
                      <Bell className="h-5 w-5" />
                      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground">Notifications</h4>
                      <div className="space-y-2">
                        {notifications.map((notification) => (
                          <div key={notification.id} className="flex flex-col gap-1 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                            <p className="text-sm font-medium text-foreground">{notification.title}</p>
                            <p className="text-xs text-muted-foreground">{notification.description}</p>
                            <p className="text-xs text-muted-foreground/70">{notification.time}</p>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" className="w-full">View all notifications</Button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Settings Sheet */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Settings</SheetTitle>
                      <SheetDescription>Configure your application preferences</SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-foreground">Appearance</h4>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="dark-mode" className="text-sm text-muted-foreground">Dark Mode</Label>
                          <Switch id="dark-mode" />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="compact" className="text-sm text-muted-foreground">Compact View</Label>
                          <Switch id="compact" />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-foreground">Notifications</h4>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email-notif" className="text-sm text-muted-foreground">Email Notifications</Label>
                          <Switch id="email-notif" />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="reminder" className="text-sm text-muted-foreground">Assignment Reminders</Label>
                          <Switch id="reminder" defaultChecked />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-foreground">Data</h4>
                        <Button variant="outline" size="sm" className="w-full">Export All Data</Button>
                        <Button variant="outline" size="sm" className="w-full">Import Data</Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Profile Dropdown */}
                <div className="hidden sm:flex items-center gap-3 ml-2 pl-4 border-l border-border">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent-foreground flex items-center justify-center text-primary-foreground font-semibold text-sm shadow-md">
                          T
                        </div>
                        <div className="hidden lg:block text-left">
                          <p className="text-sm font-medium text-foreground">Teacher</p>
                          <p className="text-xs text-muted-foreground">Admin</p>
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Help & Support
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="cursor-pointer text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 bg-background overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Search Command Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search classes, students..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Classes">
            {classes.slice(0, 5).map((cls) => (
              <CommandItem
                key={cls.id}
                onSelect={() => {
                  navigate(`/class/${cls.id}`);
                  setSearchOpen(false);
                }}
              >
                <GraduationCap className="mr-2 h-4 w-4" />
                {cls.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Students">
            {students.slice(0, 5).map((student) => (
              <CommandItem
                key={student.id}
                onSelect={() => {
                  if (student.classId) {
                    navigate(`/class/${student.classId}`);
                  }
                  setSearchOpen(false);
                }}
              >
                <User className="mr-2 h-4 w-4" />
                {student.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </SidebarProvider>
  );
}
