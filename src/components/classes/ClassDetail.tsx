import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, ClipboardList, GraduationCap, LayoutDashboard } from "lucide-react";
import { Class, Institute } from "@/lib/db";
import { ClassDashboard } from "./ClassDashboard";
import { ClassStudents } from "./ClassStudents";
import { ClassTasks } from "./ClassTasks";
import { ClassGrades } from "./ClassGrades";

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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{institute.name}</p>
          <h1 className="text-3xl font-bold text-foreground">{classData.name}</h1>
          {classData.subject && (
            <p className="text-muted-foreground">{classData.subject}</p>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Students</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Tasks</span>
          </TabsTrigger>
          <TabsTrigger value="grades" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Grades</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <ClassDashboard classId={classData.id} key={`dashboard-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="students" className="mt-6">
          <ClassStudents classId={classData.id} onDataChange={handleDataChange} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <ClassTasks classId={classData.id} onDataChange={handleDataChange} />
        </TabsContent>

        <TabsContent value="grades" className="mt-6">
          <ClassGrades classId={classData.id} key={`grades-${refreshKey}`} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
