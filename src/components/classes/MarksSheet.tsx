import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Settings, Trash2, Save, Calculator, FileSpreadsheet, RefreshCw, AlertCircle, Download } from "lucide-react";
import { toast } from "sonner";
import {
  Student,
  Task,
  Grade,
  Attendance,
  Behaviour,
  BehaviourRating,
  getStudentsByClass,
  getTasksByClass,
  getAllGrades,
  getAttendanceByClass,
  getBehaviourByClass,
} from "@/lib/db";

interface MarksSheetProps {
  classId: string;
}

interface MarksColumn {
  id: string;
  name: string;
  maxMarks: number;
  type: "auto" | "manual";
  autoSource?: "attendance" | "behaviour" | "assignments" | "quizzes" | "presentations" | "projects";
  weight?: number; // For percentage-based calculation
}

interface SessionalConfig {
  usePercentage: boolean; // true = weighted percentages, false = fixed points
  columns: MarksColumn[];
}

interface ExamColumn {
  id: string;
  name: string;
  maxMarks: number;
}

interface MarksSheetConfig {
  id: string;
  name: string;
  sessional: SessionalConfig;
  exams: ExamColumn[];
  totalMaxMarks: number;
}

// Preset templates
const PRESET_TEMPLATES: Record<string, MarksSheetConfig> = {
  semester: {
    id: "semester",
    name: "Semester System",
    sessional: {
      usePercentage: true,
      columns: [
        { id: "attendance", name: "Attendance", maxMarks: 10, type: "auto", autoSource: "attendance", weight: 10 },
        { id: "behaviour", name: "Behaviour", maxMarks: 5, type: "auto", autoSource: "behaviour", weight: 5 },
        { id: "assignments", name: "Assignments", maxMarks: 10, type: "auto", autoSource: "assignments", weight: 10 },
        { id: "quizzes", name: "Quizzes", maxMarks: 10, type: "auto", autoSource: "quizzes", weight: 10 },
        { id: "presentations", name: "Presentations", maxMarks: 5, type: "auto", autoSource: "presentations", weight: 5 },
      ],
    },
    exams: [
      { id: "mids", name: "Mid Term", maxMarks: 20 },
      { id: "finals", name: "Final Exam", maxMarks: 40 },
    ],
    totalMaxMarks: 100,
  },
  annual: {
    id: "annual",
    name: "Annual System",
    sessional: {
      usePercentage: false,
      columns: [
        { id: "attendance", name: "Attendance", maxMarks: 5, type: "auto", autoSource: "attendance" },
        { id: "behaviour", name: "Behaviour", maxMarks: 5, type: "auto", autoSource: "behaviour" },
        { id: "assignments", name: "Assignments", maxMarks: 10, type: "auto", autoSource: "assignments" },
      ],
    },
    exams: [
      { id: "first_term", name: "First Term", maxMarks: 30 },
      { id: "second_term", name: "Second Term", maxMarks: 50 },
    ],
    totalMaxMarks: 100,
  },
  continuous: {
    id: "continuous",
    name: "Continuous Assessment",
    sessional: {
      usePercentage: true,
      columns: [
        { id: "attendance", name: "Attendance", maxMarks: 15, type: "auto", autoSource: "attendance", weight: 15 },
        { id: "behaviour", name: "Behaviour", maxMarks: 10, type: "auto", autoSource: "behaviour", weight: 10 },
        { id: "assignments", name: "Assignments", maxMarks: 20, type: "auto", autoSource: "assignments", weight: 20 },
        { id: "quizzes", name: "Quizzes", maxMarks: 15, type: "auto", autoSource: "quizzes", weight: 15 },
        { id: "presentations", name: "Presentations", maxMarks: 10, type: "auto", autoSource: "presentations", weight: 10 },
        { id: "projects", name: "Projects", maxMarks: 10, type: "auto", autoSource: "projects", weight: 10 },
      ],
    },
    exams: [
      { id: "finals", name: "Final Assessment", maxMarks: 20 },
    ],
    totalMaxMarks: 100,
  },
};

const BEHAVIOUR_VALUES: Record<BehaviourRating, number> = {
  excellent: 5,
  good: 4,
  satisfactory: 3,
  needs_improvement: 2,
  poor: 1,
};

const STORAGE_KEY = "markssheet-config";

export function MarksSheet({ classId }: MarksSheetProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [behaviour, setBehaviour] = useState<Behaviour[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [config, setConfig] = useState<MarksSheetConfig>(PRESET_TEMPLATES.semester);
  const [manualMarks, setManualMarks] = useState<Record<string, Record<string, number>>>({});
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnMax, setNewColumnMax] = useState(10);
  const [newColumnType, setNewColumnType] = useState<"auto" | "manual">("manual");
  const [newColumnSource, setNewColumnSource] = useState<MarksColumn["autoSource"]>("assignments");

  useEffect(() => {
    loadData();
    loadConfig();
  }, [classId]);

  async function loadData() {
    const [studentsData, tasksData, gradesData, attendanceData, behaviourData] = await Promise.all([
      getStudentsByClass(classId),
      getTasksByClass(classId),
      getAllGrades(),
      getAttendanceByClass(classId),
      getBehaviourByClass(classId),
    ]);
    
    setStudents(studentsData.sort((a, b) => a.name.localeCompare(b.name)));
    setTasks(tasksData);
    setGrades(gradesData);
    setAttendance(attendanceData);
    setBehaviour(behaviourData);
    setLoading(false);
  }

  function loadConfig() {
    const saved = localStorage.getItem(`${STORAGE_KEY}-${classId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed.config);
        setManualMarks(parsed.manualMarks || {});
      } catch (e) {
        console.error("Failed to load config", e);
      }
    }
  }

  function saveConfig() {
    localStorage.setItem(`${STORAGE_KEY}-${classId}`, JSON.stringify({ config, manualMarks }));
    toast.success("Configuration saved");
  }

  const applyTemplate = (templateId: string) => {
    setConfig(PRESET_TEMPLATES[templateId]);
    setManualMarks({});
    toast.success(`Applied ${PRESET_TEMPLATES[templateId].name} template`);
  };

  // Calculate auto-filled marks for a student
  const calculateAutoMarks = useCallback((studentId: string, column: MarksColumn): number => {
    if (column.type === "manual") return 0;
    
    switch (column.autoSource) {
      case "attendance": {
        const studentAttendance = attendance.filter(a => a.studentId === studentId);
        if (studentAttendance.length === 0) return 0;
        const presentCount = studentAttendance.filter(a => a.status === "present" || a.status === "late").length;
        const rate = presentCount / studentAttendance.length;
        return Math.round(rate * column.maxMarks * 10) / 10;
      }
      case "behaviour": {
        const studentBehaviour = behaviour.filter(b => b.studentId === studentId);
        if (studentBehaviour.length === 0) return 0;
        const total = studentBehaviour.reduce((sum, b) => sum + BEHAVIOUR_VALUES[b.rating], 0);
        const avg = total / studentBehaviour.length;
        return Math.round((avg / 5) * column.maxMarks * 10) / 10;
      }
      case "assignments": {
        const assignmentTasks = tasks.filter(t => t.type === "assignment");
        if (assignmentTasks.length === 0) return 0;
        const studentGrades = grades.filter(g => 
          g.studentId === studentId && 
          assignmentTasks.some(t => t.id === g.taskId)
        );
        if (studentGrades.length === 0) return 0;
        const totalMax = assignmentTasks.reduce((sum, t) => sum + t.maxScore, 0);
        const totalScore = studentGrades.reduce((sum, g) => {
          const task = assignmentTasks.find(t => t.id === g.taskId);
          return sum + (g.score / (task?.maxScore || 1)) * (task?.maxScore || 0);
        }, 0);
        return Math.round((totalScore / totalMax) * column.maxMarks * 10) / 10;
      }
      case "quizzes": {
        const quizTasks = tasks.filter(t => t.type === "quiz");
        if (quizTasks.length === 0) return 0;
        const studentGrades = grades.filter(g => 
          g.studentId === studentId && 
          quizTasks.some(t => t.id === g.taskId)
        );
        if (studentGrades.length === 0) return 0;
        const totalMax = quizTasks.reduce((sum, t) => sum + t.maxScore, 0);
        const totalScore = studentGrades.reduce((sum, g) => {
          const task = quizTasks.find(t => t.id === g.taskId);
          return sum + (g.score / (task?.maxScore || 1)) * (task?.maxScore || 0);
        }, 0);
        return Math.round((totalScore / totalMax) * column.maxMarks * 10) / 10;
      }
      case "presentations": {
        const presTasks = tasks.filter(t => t.type === "presentation");
        if (presTasks.length === 0) return 0;
        const studentGrades = grades.filter(g => 
          g.studentId === studentId && 
          presTasks.some(t => t.id === g.taskId)
        );
        if (studentGrades.length === 0) return 0;
        const totalMax = presTasks.reduce((sum, t) => sum + t.maxScore, 0);
        const totalScore = studentGrades.reduce((sum, g) => {
          const task = presTasks.find(t => t.id === g.taskId);
          return sum + (g.score / (task?.maxScore || 1)) * (task?.maxScore || 0);
        }, 0);
        return Math.round((totalScore / totalMax) * column.maxMarks * 10) / 10;
      }
      case "projects": {
        const projectTasks = tasks.filter(t => t.type === "project");
        if (projectTasks.length === 0) return 0;
        const studentGrades = grades.filter(g => 
          g.studentId === studentId && 
          projectTasks.some(t => t.id === g.taskId)
        );
        if (studentGrades.length === 0) return 0;
        const totalMax = projectTasks.reduce((sum, t) => sum + t.maxScore, 0);
        const totalScore = studentGrades.reduce((sum, g) => {
          const task = projectTasks.find(t => t.id === g.taskId);
          return sum + (g.score / (task?.maxScore || 1)) * (task?.maxScore || 0);
        }, 0);
        return Math.round((totalScore / totalMax) * column.maxMarks * 10) / 10;
      }
      default:
        return 0;
    }
  }, [tasks, grades, attendance, behaviour]);

  // Get mark for a student and column
  const getMarkForColumn = useCallback((studentId: string, columnId: string, isExam: boolean): number => {
    if (isExam) {
      return manualMarks[studentId]?.[columnId] || 0;
    }
    
    const column = config.sessional.columns.find(c => c.id === columnId);
    if (!column) return 0;
    
    if (column.type === "auto") {
      return calculateAutoMarks(studentId, column);
    }
    
    return manualMarks[studentId]?.[columnId] || 0;
  }, [config, manualMarks, calculateAutoMarks]);

  // Calculate totals for a student
  const getStudentTotals = useCallback((studentId: string) => {
    let sessionalTotal = 0;
    let examTotal = 0;
    
    config.sessional.columns.forEach(col => {
      sessionalTotal += getMarkForColumn(studentId, col.id, false);
    });
    
    config.exams.forEach(exam => {
      examTotal += getMarkForColumn(studentId, exam.id, true);
    });
    
    return {
      sessional: Math.round(sessionalTotal * 10) / 10,
      exam: Math.round(examTotal * 10) / 10,
      total: Math.round((sessionalTotal + examTotal) * 10) / 10,
    };
  }, [config, getMarkForColumn]);

  // Update manual marks
  const updateManualMark = (studentId: string, columnId: string, value: number) => {
    setManualMarks(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [columnId]: value,
      },
    }));
  };

  // Add new column
  const addColumn = (isExam: boolean) => {
    if (!newColumnName.trim()) return;
    
    const newId = crypto.randomUUID();
    
    if (isExam) {
      setConfig(prev => ({
        ...prev,
        exams: [...prev.exams, { id: newId, name: newColumnName, maxMarks: newColumnMax }],
      }));
    } else {
      const newColumn: MarksColumn = {
        id: newId,
        name: newColumnName,
        maxMarks: newColumnMax,
        type: newColumnType,
        autoSource: newColumnType === "auto" ? newColumnSource : undefined,
      };
      setConfig(prev => ({
        ...prev,
        sessional: {
          ...prev.sessional,
          columns: [...prev.sessional.columns, newColumn],
        },
      }));
    }
    
    setNewColumnName("");
    setNewColumnMax(10);
    toast.success("Column added");
  };

  // Remove column
  const removeColumn = (columnId: string, isExam: boolean) => {
    if (isExam) {
      setConfig(prev => ({
        ...prev,
        exams: prev.exams.filter(e => e.id !== columnId),
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        sessional: {
          ...prev.sessional,
          columns: prev.sessional.columns.filter(c => c.id !== columnId),
        },
      }));
    }
    toast.success("Column removed");
  };

  // Calculate max possible totals
  const maxSessional = config.sessional.columns.reduce((sum, c) => sum + c.maxMarks, 0);
  const maxExam = config.exams.reduce((sum, e) => sum + e.maxMarks, 0);
  const maxTotal = maxSessional + maxExam;

  const getGradeLabel = (percentage: number): { grade: string; color: string } => {
    if (percentage >= 90) return { grade: "A+", color: "text-chart-1" };
    if (percentage >= 80) return { grade: "A", color: "text-chart-1" };
    if (percentage >= 70) return { grade: "B", color: "text-chart-2" };
    if (percentage >= 60) return { grade: "C", color: "text-chart-2" };
    if (percentage >= 50) return { grade: "D", color: "text-chart-3" };
    return { grade: "F", color: "text-destructive" };
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">Add students first to create marks sheet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Marks Sheet
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Template: {config.name} | Total: {maxTotal} marks
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select onValueChange={applyTemplate}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Apply Template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semester">Semester System</SelectItem>
              <SelectItem value="annual">Annual System</SelectItem>
              <SelectItem value="continuous">Continuous Assessment</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Configure Marks Sheet</DialogTitle>
                <DialogDescription>
                  Add, edit, or remove columns for sessional and exam marks
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="sessional" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="sessional">Sessional ({maxSessional} marks)</TabsTrigger>
                  <TabsTrigger value="exams">Exams ({maxExam} marks)</TabsTrigger>
                </TabsList>
                
                <TabsContent value="sessional" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Switch
                      checked={config.sessional.usePercentage}
                      onCheckedChange={(v) => setConfig(prev => ({
                        ...prev,
                        sessional: { ...prev.sessional, usePercentage: v },
                      }))}
                    />
                    <Label>Use weighted percentages</Label>
                  </div>
                  
                  <div className="space-y-2">
                    {config.sessional.columns.map(col => (
                      <div key={col.id} className="flex items-center gap-2 p-2 rounded bg-accent/50">
                        <div className="flex-1">
                          <span className="font-medium">{col.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {col.type === "auto" ? `Auto: ${col.autoSource}` : "Manual"}
                          </Badge>
                        </div>
                        <span className="text-muted-foreground">Max: {col.maxMarks}</span>
                        <Button variant="ghost" size="icon" onClick={() => removeColumn(col.id, false)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium">Add New Sessional Column</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={newColumnName}
                          onChange={(e) => setNewColumnName(e.target.value)}
                          placeholder="Column name"
                        />
                      </div>
                      <div>
                        <Label>Max Marks</Label>
                        <Input
                          type="number"
                          value={newColumnMax}
                          onChange={(e) => setNewColumnMax(Number(e.target.value))}
                          min={1}
                        />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select value={newColumnType} onValueChange={(v) => setNewColumnType(v as "auto" | "manual")}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto-fill</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {newColumnType === "auto" && (
                        <div>
                          <Label>Source</Label>
                          <Select value={newColumnSource} onValueChange={(v) => setNewColumnSource(v as MarksColumn["autoSource"])}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="attendance">Attendance</SelectItem>
                              <SelectItem value="behaviour">Behaviour</SelectItem>
                              <SelectItem value="assignments">Assignments</SelectItem>
                              <SelectItem value="quizzes">Quizzes</SelectItem>
                              <SelectItem value="presentations">Presentations</SelectItem>
                              <SelectItem value="projects">Projects</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <Button onClick={() => addColumn(false)} className="gap-2">
                      <Plus className="h-4 w-4" /> Add Column
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="exams" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    {config.exams.map(exam => (
                      <div key={exam.id} className="flex items-center gap-2 p-2 rounded bg-accent/50">
                        <span className="flex-1 font-medium">{exam.name}</span>
                        <span className="text-muted-foreground">Max: {exam.maxMarks}</span>
                        <Button variant="ghost" size="icon" onClick={() => removeColumn(exam.id, true)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium">Add New Exam Column</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={newColumnName}
                          onChange={(e) => setNewColumnName(e.target.value)}
                          placeholder="e.g., Mid Term"
                        />
                      </div>
                      <div>
                        <Label>Max Marks</Label>
                        <Input
                          type="number"
                          value={newColumnMax}
                          onChange={(e) => setNewColumnMax(Number(e.target.value))}
                          min={1}
                        />
                      </div>
                    </div>
                    <Button onClick={() => addColumn(true)} className="gap-2">
                      <Plus className="h-4 w-4" /> Add Exam
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter className="mt-4">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={() => { saveConfig(); setShowConfigDialog(false); }} className="gap-2">
                  <Save className="h-4 w-4" /> Save Configuration
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={() => loadData()} variant="outline" size="icon" title="Refresh data">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={saveConfig} className="gap-2">
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Save</span>
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 text-sm">
        <Calculator className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <span className="font-medium">Auto-fill columns</span> calculate marks from your recorded data (attendance, behaviour, task grades).
          <span className="font-medium"> Manual columns</span> require you to enter marks directly in the table.
        </div>
      </div>

      {/* Marks Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="sticky left-0 bg-muted/50 z-10 w-[200px]">Student</TableHead>
                    {config.sessional.columns.map(col => (
                      <TableHead key={col.id} className="text-center min-w-[80px]">
                        <div className="flex flex-col items-center">
                          <span className="truncate max-w-[80px]">{col.name}</span>
                          <span className="text-xs text-muted-foreground">/{col.maxMarks}</span>
                          {col.type === "auto" && (
                            <Badge variant="secondary" className="text-[10px] mt-1">Auto</Badge>
                          )}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center bg-accent/50 min-w-[80px]">
                      <div className="flex flex-col items-center">
                        <span>Sessional</span>
                        <span className="text-xs text-muted-foreground">/{maxSessional}</span>
                      </div>
                    </TableHead>
                    {config.exams.map(exam => (
                      <TableHead key={exam.id} className="text-center min-w-[80px]">
                        <div className="flex flex-col items-center">
                          <span className="truncate max-w-[80px]">{exam.name}</span>
                          <span className="text-xs text-muted-foreground">/{exam.maxMarks}</span>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center bg-primary/10 min-w-[80px]">
                      <div className="flex flex-col items-center">
                        <span>Total</span>
                        <span className="text-xs text-muted-foreground">/{maxTotal}</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center bg-primary/10 min-w-[60px]">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student, index) => {
                    const totals = getStudentTotals(student.id);
                    const percentage = maxTotal > 0 ? (totals.total / maxTotal) * 100 : 0;
                    const gradeInfo = getGradeLabel(percentage);
                    
                    return (
                      <TableRow key={student.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <TableCell className="sticky left-0 bg-inherit z-10">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={student.photo} />
                              <AvatarFallback className="text-xs">
                                {student.name.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium truncate max-w-[120px]">{student.name}</span>
                          </div>
                        </TableCell>
                        {config.sessional.columns.map(col => {
                          const mark = getMarkForColumn(student.id, col.id, false);
                          const isAuto = col.type === "auto";
                          return (
                            <TableCell key={col.id} className="text-center p-1">
                              {isAuto ? (
                                <span className={mark === 0 ? "text-muted-foreground" : ""}>
                                  {mark}
                                </span>
                              ) : (
                                <Input
                                  type="number"
                                  value={manualMarks[student.id]?.[col.id] || ""}
                                  onChange={(e) => updateManualMark(student.id, col.id, Number(e.target.value))}
                                  className="w-16 h-8 text-center mx-auto"
                                  min={0}
                                  max={col.maxMarks}
                                  placeholder="0"
                                />
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-medium bg-accent/30">
                          {totals.sessional}
                        </TableCell>
                        {config.exams.map(exam => (
                          <TableCell key={exam.id} className="text-center p-1">
                            <Input
                              type="number"
                              value={manualMarks[student.id]?.[exam.id] || ""}
                              onChange={(e) => updateManualMark(student.id, exam.id, Number(e.target.value))}
                              className="w-16 h-8 text-center mx-auto"
                              min={0}
                              max={exam.maxMarks}
                              placeholder="0"
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-bold bg-primary/10">
                          {totals.total}
                        </TableCell>
                        <TableCell className={`text-center font-bold bg-primary/10 ${gradeInfo.color}`}>
                          {gradeInfo.grade}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Class Average</p>
            <p className="text-2xl font-bold">
              {students.length > 0 
                ? (students.reduce((sum, s) => sum + getStudentTotals(s.id).total, 0) / students.length).toFixed(1)
                : 0
              }
            </p>
            <p className="text-xs text-muted-foreground">out of {maxTotal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Highest Score</p>
            <p className="text-2xl font-bold text-chart-1">
              {students.length > 0
                ? Math.max(...students.map(s => getStudentTotals(s.id).total))
                : 0
              }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Lowest Score</p>
            <p className="text-2xl font-bold text-chart-3">
              {students.length > 0
                ? Math.min(...students.map(s => getStudentTotals(s.id).total))
                : 0
              }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pass Rate</p>
            <p className="text-2xl font-bold text-chart-2">
              {students.length > 0
                ? Math.round(
                    (students.filter(s => (getStudentTotals(s.id).total / maxTotal) * 100 >= 50).length / students.length) * 100
                  )
                : 0
              }%
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
