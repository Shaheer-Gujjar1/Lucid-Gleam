import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, ClipboardList, Calendar, LayoutDashboard, BookOpen, BarChart3, Grid3X3, Settings2, Heart, FileSpreadsheet } from "lucide-react";
import { Class, Institute } from "@/lib/db";
import { ClassDashboard } from "./ClassDashboard";
import { ClassStudents } from "./ClassStudents";
import { ClassTasks } from "./ClassTasks";
import { ClassAttendance } from "./ClassAttendance";
import { ClassSchedule } from "./ClassSchedule";
import { ClassBehaviour } from "./ClassBehaviour";
import { ClassAnalytics } from "./ClassAnalytics";
import { SeatingChart } from "./SeatingChart";
import { MarksSheet } from "./MarksSheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ClassDetailProps {
  institute: Institute;
  classData: Class;
  onBack: () => void;
}

export function ClassDetail({ institute, classData, onBack }: ClassDetailProps) {
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const urlStudentId = searchParams.get("studentId");
  
  const [activeTab, setActiveTab] = useState(urlTab || "dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (urlTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleDataChange = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 pb-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-accent transition-colors mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs font-normal">{institute.name}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground shadow-lg">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{classData.name}</h1>
              {classData.subject && <p className="text-muted-foreground text-sm">{classData.subject}</p>}
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea className="w-full">
          <div className="bg-card/60 backdrop-blur-xl rounded-xl p-1.5 shadow-lg border border-border/30">
            <TabsList className="flex w-max gap-1 bg-transparent p-0">
              <TabsTrigger value="dashboard" className="gap-1.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <LayoutDashboard className="h-4 w-4 shrink-0" /><span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="students" className="gap-1.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Users className="h-4 w-4 shrink-0" /><span>Students</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-1.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <ClipboardList className="h-4 w-4 shrink-0" /><span>Tasks</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BarChart3 className="h-4 w-4 shrink-0" /><span>Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="attendance" className="gap-1.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Calendar className="h-4 w-4 shrink-0" /><span>Attendance</span>
              </TabsTrigger>
              <TabsTrigger value="behaviour" className="gap-1.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Heart className="h-4 w-4 shrink-0" /><span>Behaviour</span>
              </TabsTrigger>
              <TabsTrigger value="marks" className="gap-1.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileSpreadsheet className="h-4 w-4 shrink-0" /><span>Marks Sheet</span>
              </TabsTrigger>
              <TabsTrigger value="seating" className="gap-1.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Grid3X3 className="h-4 w-4 shrink-0" /><span>Seating</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="gap-1.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Settings2 className="h-4 w-4 shrink-0" /><span>Schedule</span>
              </TabsTrigger>
            </TabsList>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="dashboard" className="mt-6"><ClassDashboard classId={classData.id} key={`dashboard-${refreshKey}`} /></TabsContent>
        <TabsContent value="students" className="mt-6"><ClassStudents classId={classData.id} onDataChange={handleDataChange} /></TabsContent>
        <TabsContent value="tasks" className="mt-6"><ClassTasks classId={classData.id} onDataChange={handleDataChange} /></TabsContent>
        <TabsContent value="analytics" className="mt-6"><ClassAnalytics classId={classData.id} initialStudentId={urlStudentId || undefined} /></TabsContent>
        <TabsContent value="attendance" className="mt-6"><ClassAttendance classId={classData.id} /></TabsContent>
        <TabsContent value="behaviour" className="mt-6"><ClassBehaviour classId={classData.id} /></TabsContent>
        <TabsContent value="marks" className="mt-6"><MarksSheet classId={classData.id} /></TabsContent>
        <TabsContent value="seating" className="mt-6"><SeatingChart classId={classData.id} /></TabsContent>
        <TabsContent value="schedule" className="mt-6"><ClassSchedule classId={classData.id} /></TabsContent>
      </Tabs>
    </div>
  );
}