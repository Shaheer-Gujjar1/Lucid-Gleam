import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { GraduationCap, Bell, Search, User, AlertTriangle, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useState, useEffect } from "react";
import { getAllClasses, getAllStudents, getAllTasks, Task, Class } from "@/lib/db";
import { differenceInDays, isPast, isToday, isTomorrow, format } from "date-fns";

interface NotificationItem {
  id: string;
  classId: string;
  title: string;
  description: string;
  time: string;
  type: "overdue" | "today" | "tomorrow" | "upcoming";
}

export function AppLayout() {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [classesData, studentsData, tasksData] = await Promise.all([
        getAllClasses(),
        getAllStudents(),
        getAllTasks()
      ]);
      setClasses(classesData);
      setStudents(studentsData);
      
      // Build real notifications from tasks
      const now = new Date();
      const taskNotifications: NotificationItem[] = tasksData
        .filter(task => task.dueDate)
        .map(task => {
          const dueDate = new Date(task.dueDate!);
          const daysUntil = differenceInDays(dueDate, now);
          
          let type: NotificationItem["type"];
          let time: string;
          
          if (isPast(dueDate) && !isToday(dueDate)) {
            type = "overdue";
            time = `Overdue by ${Math.abs(daysUntil)} day(s)`;
          } else if (isToday(dueDate)) {
            type = "today";
            time = "Due today";
          } else if (isTomorrow(dueDate)) {
            type = "tomorrow";
            time = "Due tomorrow";
          } else if (daysUntil <= 7) {
            type = "upcoming";
            time = `Due in ${daysUntil} days`;
          } else {
            return null;
          }
          
          const cls = classesData.find(c => c.id === task.classId);
          
          return {
            id: task.id,
            classId: task.classId,
            title: task.title,
            description: cls ? `${task.type} - ${cls.name}` : task.type,
            time,
            type
          };
        })
        .filter((n): n is NotificationItem => n !== null)
        .sort((a, b) => {
          const order = { overdue: 0, today: 1, tomorrow: 2, upcoming: 3 };
          return order[a.type] - order[b.type];
        })
        .slice(0, 10);
      
      setNotifications(taskNotifications);
    };
    loadData();
  }, []);

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

  const getNotificationIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "overdue": return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "today": return <Bell className="h-4 w-4 text-chart-4" />;
      case "tomorrow": return <Clock className="h-4 w-4 text-chart-3" />;
      default: return <Calendar className="h-4 w-4 text-chart-1" />;
    }
  };

  const overdueCount = notifications.filter(n => n.type === "overdue" || n.type === "today").length;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/30">
        <div className="fixed left-4 top-4 bottom-4 z-40">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0 pl-[calc(var(--sidebar-width)+2rem)] transition-all duration-300">
          <header className="sticky top-4 z-50 mx-4 rounded-2xl border border-border/30 bg-card/60 backdrop-blur-xl shadow-lg shadow-primary/5">
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
                <div className="relative cursor-pointer" onClick={() => setSearchOpen(true)}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search... (⌘K)" 
                    className="pl-10 bg-background/50 border-border/50 focus:border-primary/50 transition-colors cursor-pointer"
                    readOnly
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Notifications Popover - Real Data */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
                      <Bell className="h-5 w-5" />
                      {overdueCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                          {overdueCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-popover" align="end">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground">Upcoming Deadlines</h4>
                      {notifications.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No upcoming deadlines</p>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {notifications.map((notification) => (
                            <div 
                              key={notification.id} 
                              className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => {
                                const cls = classes.find(c => c.id === notification.classId);
                                if (cls) {
                                  navigate(`/institute/${cls.instituteId}/class/${cls.id}?tab=tasks&taskId=${notification.id}`);
                                }
                              }}
                            >
                              {getNotificationIcon(notification.type)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{notification.title}</p>
                                <p className="text-xs text-muted-foreground">{notification.description}</p>
                                <Badge 
                                  variant={notification.type === "overdue" ? "destructive" : "secondary"} 
                                  className="text-xs mt-1"
                                >
                                  {notification.time}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/reminders")}>
                        View all reminders
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 pt-8 bg-transparent overflow-auto">
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
                  navigate(`/institute/${cls.instituteId}/class/${cls.id}`);
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
                  const cls = classes.find(c => c.id === student.classId);
                  if (cls) {
                    navigate(`/institute/${cls.instituteId}/class/${cls.id}`);
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
