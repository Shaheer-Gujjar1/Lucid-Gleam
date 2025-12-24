import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllTasks, getAllClasses, Task, Class } from "@/lib/db";
import { differenceInDays, isPast, isToday, isTomorrow, format } from "date-fns";
import { AlertTriangle, Bell, Clock, Calendar, ArrowLeft } from "lucide-react";

interface ReminderWithClass extends Task {
  className: string;
  instituteId: string;
  status: "overdue" | "today" | "tomorrow" | "upcoming" | "later";
  daysUntil: number;
}

export default function RemindersPage() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<ReminderWithClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReminders = async () => {
      const [tasks, classes] = await Promise.all([
        getAllTasks(),
        getAllClasses()
      ]);

      const classMap = new Map(classes.map(c => [c.id, c]));
      const now = new Date();

      const remindersWithStatus: ReminderWithClass[] = tasks
        .filter(task => task.dueDate)
        .map(task => {
          const dueDate = new Date(task.dueDate!);
          const daysUntil = differenceInDays(dueDate, now);
          const cls = classMap.get(task.classId);

          let status: ReminderWithClass["status"];
          if (isPast(dueDate) && !isToday(dueDate)) {
            status = "overdue";
          } else if (isToday(dueDate)) {
            status = "today";
          } else if (isTomorrow(dueDate)) {
            status = "tomorrow";
          } else if (daysUntil <= 7) {
            status = "upcoming";
          } else {
            status = "later";
          }

          return {
            ...task,
            className: cls?.name || "Unknown Class",
            instituteId: cls?.instituteId || "",
            status,
            daysUntil
          };
        })
        .sort((a, b) => {
          const order = { overdue: 0, today: 1, tomorrow: 2, upcoming: 3, later: 4 };
          if (order[a.status] !== order[b.status]) {
            return order[a.status] - order[b.status];
          }
          return a.daysUntil - b.daysUntil;
        });

      setReminders(remindersWithStatus);
      setLoading(false);
    };

    loadReminders();
  }, []);

  const getStatusIcon = (status: ReminderWithClass["status"]) => {
    switch (status) {
      case "overdue": return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case "today": return <Bell className="h-5 w-5 text-chart-4" />;
      case "tomorrow": return <Clock className="h-5 w-5 text-chart-3" />;
      default: return <Calendar className="h-5 w-5 text-chart-1" />;
    }
  };

  const getStatusBadge = (status: ReminderWithClass["status"], daysUntil: number) => {
    switch (status) {
      case "overdue":
        return <Badge variant="destructive">Overdue by {Math.abs(daysUntil)} day(s)</Badge>;
      case "today":
        return <Badge className="bg-chart-4 text-chart-4-foreground">Due Today</Badge>;
      case "tomorrow":
        return <Badge className="bg-chart-3 text-chart-3-foreground">Due Tomorrow</Badge>;
      case "upcoming":
        return <Badge variant="secondary">Due in {daysUntil} days</Badge>;
      default:
        return <Badge variant="outline">Due in {daysUntil} days</Badge>;
    }
  };

  const handleReminderClick = (reminder: ReminderWithClass) => {
    navigate(`/institute/${reminder.instituteId}/class/${reminder.classId}?tab=tasks&taskId=${reminder.id}`);
  };

  const overdueReminders = reminders.filter(r => r.status === "overdue");
  const todayReminders = reminders.filter(r => r.status === "today");
  const upcomingReminders = reminders.filter(r => r.status === "tomorrow" || r.status === "upcoming" || r.status === "later");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">All Reminders</h1>
          <p className="text-muted-foreground">View and manage all your assignment reminders</p>
        </div>
      </div>

      {reminders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Reminders</h3>
            <p className="text-muted-foreground text-center max-w-md">
              You don't have any upcoming assignments, quizzes, or presentations with due dates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Overdue Section */}
          {overdueReminders.length > 0 && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Overdue ({overdueReminders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {overdueReminders.map(reminder => (
                  <div
                    key={reminder.id}
                    onClick={() => handleReminderClick(reminder)}
                    className="flex items-center gap-4 p-4 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 cursor-pointer transition-colors"
                  >
                    {getStatusIcon(reminder.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{reminder.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {reminder.type} • {reminder.className}
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(reminder.status, reminder.daysUntil)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(reminder.dueDate!), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Today Section */}
          {todayReminders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-chart-4" />
                  Due Today ({todayReminders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {todayReminders.map(reminder => (
                  <div
                    key={reminder.id}
                    onClick={() => handleReminderClick(reminder)}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    {getStatusIcon(reminder.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{reminder.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {reminder.type} • {reminder.className}
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(reminder.status, reminder.daysUntil)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Section */}
          {upcomingReminders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-chart-1" />
                  Upcoming ({upcomingReminders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingReminders.map(reminder => (
                  <div
                    key={reminder.id}
                    onClick={() => handleReminderClick(reminder)}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    {getStatusIcon(reminder.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{reminder.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {reminder.type} • {reminder.className}
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(reminder.status, reminder.daysUntil)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(reminder.dueDate!), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
