import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Scale, Database, Upload, Settings as SettingsIcon, Moon, Sun } from "lucide-react";
import { AssignmentReminders } from "@/components/classes/AssignmentReminders";
import { BackupRestore } from "@/components/classes/BackupRestore";
import { CustomGradingScales } from "@/components/classes/CustomGradingScales";
import { BulkImport } from "@/components/classes/BulkImport";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  
  // Settings state with localStorage persistence
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true";
  });
  const [compactView, setCompactView] = useState(() => {
    const saved = localStorage.getItem("compactView");
    return saved === "true";
  });
  const [assignmentReminders, setAssignmentReminders] = useState(() => {
    const saved = localStorage.getItem("assignmentReminders");
    return saved !== "false"; // default true
  });
  const [quizReminders, setQuizReminders] = useState(() => {
    const saved = localStorage.getItem("quizReminders");
    return saved !== "false"; // default true
  });
  const [presentationReminders, setPresentationReminders] = useState(() => {
    const saved = localStorage.getItem("presentationReminders");
    return saved !== "false"; // default true
  });

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  // Apply compact view
  useEffect(() => {
    if (compactView) {
      document.documentElement.classList.add("compact");
    } else {
      document.documentElement.classList.remove("compact");
    }
    localStorage.setItem("compactView", String(compactView));
  }, [compactView]);

  // Save reminder preferences
  useEffect(() => {
    localStorage.setItem("assignmentReminders", String(assignmentReminders));
  }, [assignmentReminders]);

  useEffect(() => {
    localStorage.setItem("quizReminders", String(quizReminders));
  }, [quizReminders]);

  useEffect(() => {
    localStorage.setItem("presentationReminders", String(presentationReminders));
  }, [presentationReminders]);

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked);
    toast.success(checked ? "Dark mode enabled" : "Light mode enabled");
  };

  const handleCompactToggle = (checked: boolean) => {
    setCompactView(checked);
    toast.success(checked ? "Compact view enabled" : "Standard view enabled");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground shadow-lg">
          <SettingsIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm">Configure your application preferences</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea className="w-full">
          <div className="bg-card rounded-xl p-1.5 shadow-sm border border-border/50">
            <TabsList className="flex w-max gap-1 bg-transparent p-0">
              <TabsTrigger value="general" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <SettingsIcon className="h-4 w-4" />
                <span>General</span>
              </TabsTrigger>
              <TabsTrigger value="reminders" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Bell className="h-4 w-4" />
                <span>Reminders</span>
              </TabsTrigger>
              <TabsTrigger value="scales" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Scale className="h-4 w-4" />
                <span>Grading Scales</span>
              </TabsTrigger>
              <TabsTrigger value="import" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Upload className="h-4 w-4" />
                <span>Bulk Import</span>
              </TabsTrigger>
              <TabsTrigger value="backup" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Database className="h-4 w-4" />
                <span>Backup & Restore</span>
              </TabsTrigger>
            </TabsList>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="general" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  Appearance
                </CardTitle>
                <CardDescription>Customize how the app looks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="dark-mode" className="text-sm font-medium">Dark Mode</Label>
                    <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
                  </div>
                  <Switch 
                    id="dark-mode" 
                    checked={darkMode} 
                    onCheckedChange={handleDarkModeToggle}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="compact" className="text-sm font-medium">Compact View</Label>
                    <p className="text-xs text-muted-foreground">Reduce spacing for more content</p>
                  </div>
                  <Switch 
                    id="compact" 
                    checked={compactView} 
                    onCheckedChange={handleCompactToggle}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Reminder Preferences
                </CardTitle>
                <CardDescription>Choose which reminders to show</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="assignment-reminder" className="text-sm font-medium">Assignment Reminders</Label>
                    <p className="text-xs text-muted-foreground">Get notified about upcoming assignments</p>
                  </div>
                  <Switch 
                    id="assignment-reminder" 
                    checked={assignmentReminders}
                    onCheckedChange={setAssignmentReminders}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="quiz-reminder" className="text-sm font-medium">Quiz Reminders</Label>
                    <p className="text-xs text-muted-foreground">Get notified about upcoming quizzes</p>
                  </div>
                  <Switch 
                    id="quiz-reminder" 
                    checked={quizReminders}
                    onCheckedChange={setQuizReminders}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="presentation-reminder" className="text-sm font-medium">Presentation Reminders</Label>
                    <p className="text-xs text-muted-foreground">Get notified about upcoming presentations</p>
                  </div>
                  <Switch 
                    id="presentation-reminder" 
                    checked={presentationReminders}
                    onCheckedChange={setPresentationReminders}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reminders" className="mt-6">
          <AssignmentReminders />
        </TabsContent>

        <TabsContent value="scales" className="mt-6">
          <CustomGradingScales />
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <BulkImport />
        </TabsContent>

        <TabsContent value="backup" className="mt-6">
          <BackupRestore />
        </TabsContent>
      </Tabs>
    </div>
  );
}
