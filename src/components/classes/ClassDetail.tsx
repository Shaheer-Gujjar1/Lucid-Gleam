import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, ClipboardList, Calendar, FolderOpen, LayoutDashboard, BookOpen, BarChart3, UserCheck, Upload, Bell, Grid3X3, Database, Scale } from "lucide-react";
import { Class, Institute } from "@/lib/db";
import { ClassDashboard } from "./ClassDashboard";
import { ClassStudents } from "./ClassStudents";
import { ClassTasks } from "./ClassTasks";
import { ClassAttendance } from "./ClassAttendance";
import { TeacherFiles } from "./TeacherFiles";
import { GradeReports } from "./GradeReports";
import { StudentPerformance } from "./StudentPerformance";
import { BulkImport } from "./BulkImport";
import { AssignmentReminders } from "./AssignmentReminders";
import { SeatingChart } from "./SeatingChart";
import { BackupRestore } from "./BackupRestore";
import { CustomGradingScales } from "./CustomGradingScales";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ClassDetailProps {
  institute: Institute;
  classData: Class;
  onBack: () => void;
}

export function ClassDetail({ institute, classData, onBack }: ClassDetailProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDataChange = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-start gap-4 pb-4 border-b border-border">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack}
          className="rounded-full hover:bg-accent transition-colors mt-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs font-normal">
              {institute.name}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground shadow-lg">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{classData.name}</h1>
              {classData.subject && (
                <p className="text-muted-foreground text-sm">{classData.subject}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea className="w-full">
          <div className="bg-card rounded-xl p-1.5 shadow-sm border border-border/50">
            <TabsList className="flex w-max gap-1 bg-transparent p-0">
              <TabsTrigger value="dashboard" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="students" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Students</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Tasks</span>
              </TabsTrigger>
              <TabsTrigger value="grades" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Reports</span>
              </TabsTrigger>
              <TabsTrigger value="performance" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <UserCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Performance</span>
              </TabsTrigger>
              <TabsTrigger value="reminders" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Reminders</span>
              </TabsTrigger>
              <TabsTrigger value="attendance" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Attendance</span>
              </TabsTrigger>
              <TabsTrigger value="seating" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Grid3X3 className="h-4 w-4" />
                <span className="hidden sm:inline">Seating</span>
              </TabsTrigger>
              <TabsTrigger value="import" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Files</span>
              </TabsTrigger>
              <TabsTrigger value="scales" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Scale className="h-4 w-4" />
                <span className="hidden sm:inline">Scales</span>
              </TabsTrigger>
              <TabsTrigger value="backup" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Backup</span>
              </TabsTrigger>
            </TabsList>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="dashboard" className="mt-6"><ClassDashboard classId={classData.id} key={`dashboard-${refreshKey}`} /></TabsContent>
        <TabsContent value="students" className="mt-6"><ClassStudents classId={classData.id} onDataChange={handleDataChange} /></TabsContent>
        <TabsContent value="tasks" className="mt-6"><ClassTasks classId={classData.id} onDataChange={handleDataChange} /></TabsContent>
        <TabsContent value="grades" className="mt-6"><GradeReports classId={classData.id} /></TabsContent>
        <TabsContent value="performance" className="mt-6"><StudentPerformance classId={classData.id} /></TabsContent>
        <TabsContent value="reminders" className="mt-6"><AssignmentReminders classId={classData.id} /></TabsContent>
        <TabsContent value="attendance" className="mt-6"><ClassAttendance classId={classData.id} /></TabsContent>
        <TabsContent value="seating" className="mt-6"><SeatingChart classId={classData.id} /></TabsContent>
        <TabsContent value="import" className="mt-6"><BulkImport classId={classData.id} onImportComplete={handleDataChange} /></TabsContent>
        <TabsContent value="files" className="mt-6"><TeacherFiles classId={classData.id} /></TabsContent>
        <TabsContent value="scales" className="mt-6"><CustomGradingScales /></TabsContent>
        <TabsContent value="backup" className="mt-6"><BackupRestore /></TabsContent>
      </Tabs>
    </div>
  );
}