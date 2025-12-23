import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTasksByClass, Task } from "@/lib/db";
import { Bell, Clock, AlertTriangle, CheckCircle, Calendar } from "lucide-react";
import { format, differenceInDays, isPast, isToday, isTomorrow } from "date-fns";

interface AssignmentRemindersProps {
  classId: string;
}

interface TaskWithStatus extends Task {
  status: "overdue" | "today" | "tomorrow" | "upcoming" | "no-due-date";
  daysUntil: number | null;
}

export function AssignmentReminders({ classId }: AssignmentRemindersProps) {
  const [tasks, setTasks] = useState<TaskWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "overdue" | "upcoming">("all");

  useEffect(() => {
    async function loadTasks() {
      const data = await getTasksByClass(classId);
      const now = new Date();

      const tasksWithStatus: TaskWithStatus[] = data.map((task) => {
        if (!task.dueDate) {
          return { ...task, status: "no-due-date" as const, daysUntil: null };
        }

        const dueDate = new Date(task.dueDate);
        const daysUntil = differenceInDays(dueDate, now);

        let status: TaskWithStatus["status"];
        if (isPast(dueDate) && !isToday(dueDate)) {
          status = "overdue";
        } else if (isToday(dueDate)) {
          status = "today";
        } else if (isTomorrow(dueDate)) {
          status = "tomorrow";
        } else {
          status = "upcoming";
        }

        return { ...task, status, daysUntil };
      });

      // Sort by due date (overdue first, then by date)
      tasksWithStatus.sort((a, b) => {
        const statusOrder = { overdue: 0, today: 1, tomorrow: 2, upcoming: 3, "no-due-date": 4 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return 0;
      });

      setTasks(tasksWithStatus);
      setLoading(false);
    }
    loadTasks();
  }, [classId]);

  const getStatusBadge = (status: TaskWithStatus["status"], daysUntil: number | null) => {
    switch (status) {
      case "overdue":
        return (
          <Badge className="bg-destructive/20 text-destructive gap-1">
            <AlertTriangle className="h-3 w-3" />
            Overdue
          </Badge>
        );
      case "today":
        return (
          <Badge className="bg-chart-4/20 text-chart-4 gap-1">
            <Bell className="h-3 w-3" />
            Due Today
          </Badge>
        );
      case "tomorrow":
        return (
          <Badge className="bg-chart-3/20 text-chart-3 gap-1">
            <Clock className="h-3 w-3" />
            Tomorrow
          </Badge>
        );
      case "upcoming":
        return (
          <Badge className="bg-chart-1/20 text-chart-1 gap-1">
            <Calendar className="h-3 w-3" />
            {daysUntil} days left
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            No Due Date
          </Badge>
        );
    }
  };

  const getStatusIcon = (status: TaskWithStatus["status"]) => {
    switch (status) {
      case "overdue":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case "today":
        return <Bell className="h-5 w-5 text-chart-4 animate-pulse" />;
      case "tomorrow":
        return <Clock className="h-5 w-5 text-chart-3" />;
      case "upcoming":
        return <Calendar className="h-5 w-5 text-chart-1" />;
      default:
        return <CheckCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === "all") return true;
    if (filter === "overdue") return task.status === "overdue";
    if (filter === "upcoming") return task.status !== "overdue" && task.status !== "no-due-date";
    return true;
  });

  const overdueCount = tasks.filter((t) => t.status === "overdue").length;
  const todayCount = tasks.filter((t) => t.status === "today").length;
  const upcomingCount = tasks.filter((t) => t.status === "upcoming" || t.status === "tomorrow").length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card 
          className={`border-none shadow-lg cursor-pointer transition-all ${filter === "overdue" ? "ring-2 ring-destructive" : ""}`}
          onClick={() => setFilter(filter === "overdue" ? "all" : "overdue")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{overdueCount}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Due Today</CardTitle>
            <Bell className="h-5 w-5 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-chart-4">{todayCount}</div>
          </CardContent>
        </Card>

        <Card 
          className={`border-none shadow-lg cursor-pointer transition-all ${filter === "upcoming" ? "ring-2 ring-chart-1" : ""}`}
          onClick={() => setFilter(filter === "upcoming" ? "all" : "upcoming")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
            <Calendar className="h-5 w-5 text-chart-1" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-chart-1">{upcomingCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-card-foreground">Assignment Deadlines</CardTitle>
            {filter !== "all" && (
              <Button variant="ghost" size="sm" onClick={() => setFilter("all")}>
                Show All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {tasks.length === 0 ? "No tasks created yet" : "No tasks match the current filter"}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center justify-between rounded-lg p-4 transition-colors ${
                    task.status === "overdue" 
                      ? "bg-destructive/10" 
                      : task.status === "today" 
                      ? "bg-chart-4/10" 
                      : "bg-background"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(task.status)}
                    <div>
                      <p className="font-medium text-foreground">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="capitalize text-xs">
                          {task.type}
                        </Badge>
                        {task.dueDate && (
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(task.dueDate), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(task.status, task.daysUntil)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}