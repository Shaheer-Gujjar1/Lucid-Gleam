import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { getStudentsByClass, getTasksByClass, getAllGrades, getAttendanceByClass, getBehaviourByClass, getClass, Student, Task, Grade, Attendance, Behaviour, BehaviourRating, Class, ClassSubject } from "@/lib/db";
import { TrendingUp, TrendingDown, Target, Award, Calendar, UserCheck, BookOpen, Users, BarChart3, ArrowUpRight, ArrowDownRight, Minus, Heart } from "lucide-react";
import { startOfDay, subDays, subMonths, subYears, parseISO, isSameDay, isAfter } from "date-fns";
import { StudentSearchCombobox } from "./StudentSearchCombobox";

interface GradeReportsProps {
  classId: string;
}

const RATING_VALUES: Record<BehaviourRating, number> = {
  excellent: 5,
  good: 4,
  satisfactory: 3,
  needs_improvement: 2,
  poor: 1,
};

const RATING_LABELS: Record<BehaviourRating, string> = {
  excellent: "Excellent",
  good: "Good",
  satisfactory: "Satisfactory",
  needs_improvement: "Needs Improvement",
  poor: "Poor",
};

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--chart-3))",
  "hsl(var(--destructive))",
];

type BehaviourPeriod = "7days" | "30days" | "all";

export function GradeReports({ classId }: GradeReportsProps) {
  const [classData, setClassData] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [behaviour, setBehaviour] = useState<Behaviour[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [attendancePeriod, setAttendancePeriod] = useState<string>("this_month");
  const [behaviourPeriod, setBehaviourPeriod] = useState<BehaviourPeriod>("30days");
  const [selectedBehaviourStudent, setSelectedBehaviourStudent] = useState<string | null>(null);
  const [reportTab, setReportTab] = useState<string>("grades");

  const subjects = classData?.subjects || [];

  const ATTENDANCE_PERIODS = [
    { value: "today", label: "Today" },
    { value: "this_week", label: "This Week" },
    { value: "this_month", label: "This Month" },
    { value: "last_3_months", label: "Last 3 Months" },
    { value: "last_6_months", label: "Last 6 Months" },
    { value: "last_year", label: "Last Year" },
    { value: "all_time", label: "From Start" },
  ];

  useEffect(() => {
    async function loadData() {
      const [s, t, allGrades, allAttendance, allBehaviour, classInfo] = await Promise.all([
        getStudentsByClass(classId),
        getTasksByClass(classId),
        getAllGrades(),
        getAttendanceByClass(classId),
        getBehaviourByClass(classId),
        getClass(classId),
      ]);
      const sortedStudents = s.sort((a, b) => a.name.localeCompare(b.name));
      setStudents(sortedStudents);
      setTasks(t);
      setAttendance(allAttendance);
      setBehaviour(allBehaviour);
      setClassData(classInfo || null);
      
      const studentIds = new Set(s.map((st) => st.id));
      const taskIds = new Set(t.map((tk) => tk.id));
      const classGrades = allGrades.filter(
        (g) => studentIds.has(g.studentId) && taskIds.has(g.taskId)
      );
      setGrades(classGrades);
      
      if (sortedStudents.length > 0) {
        setSelectedBehaviourStudent(sortedStudents[0].id);
      }
      
      setLoading(false);
    }
    loadData();
  }, [classId]);

  // ========== ATTENDANCE LOGIC ==========
  const getFilteredAttendance = () => {
    const now = new Date();
    let startDate: Date;
    
    switch (attendancePeriod) {
      case "today": startDate = startOfDay(now); break;
      case "this_week": startDate = subDays(now, 7); break;
      case "this_month": startDate = subMonths(now, 1); break;
      case "last_3_months": startDate = subMonths(now, 3); break;
      case "last_6_months": startDate = subMonths(now, 6); break;
      case "last_year": startDate = subYears(now, 1); break;
      default: return filterBySubject(attendance);
    }
    
    const dateFiltered = attendance.filter(a => {
      const recordDate = parseISO(a.date);
      return isSameDay(recordDate, startDate) || isAfter(recordDate, startDate);
    });
    
    return filterBySubject(dateFiltered);
  };

  const filterBySubject = (records: Attendance[]) => {
    if (selectedSubject === "all") return records;
    return records.filter(a => a.subjectId === selectedSubject);
  };

  const getAttendanceStats = () => {
    const filtered = getFilteredAttendance();
    const total = filtered.length;
    if (total === 0) return { present: 0, absent: 0, late: 0, rate: 0 };
    
    const present = filtered.filter(a => a.status === "present").length;
    const absent = filtered.filter(a => a.status === "absent").length;
    const late = filtered.filter(a => a.status === "late").length;
    const rate = Math.round((present / total) * 100);
    
    return { present, absent, late, rate, total };
  };

  const getStudentAttendanceData = () => {
    const filtered = getFilteredAttendance();
    return students.map(student => {
      const studentAtt = filtered.filter(a => a.studentId === student.id);
      const total = studentAtt.length;
      const present = studentAtt.filter(a => a.status === "present").length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      return { name: student.name.split(" ")[0], rate, present, total };
    }).sort((a, b) => b.rate - a.rate);
  };

  // ========== GRADES LOGIC ==========
  const getFilteredGrades = () => {
    if (selectedTask === "all") return grades;
    return grades.filter((g) => g.taskId === selectedTask);
  };

  const calculateStats = () => {
    const filteredGrades = getFilteredGrades();
    if (filteredGrades.length === 0) return { avg: 0, highest: 0, lowest: 0, passing: 0 };

    const percentages = filteredGrades.map((g) => {
      const task = tasks.find((t) => t.id === g.taskId);
      return task ? (g.score / task.maxScore) * 100 : 0;
    }).filter(p => p > 0);

    if (percentages.length === 0) return { avg: 0, highest: 0, lowest: 0, passing: 0 };

    const avg = percentages.reduce((a, b) => a + b, 0) / percentages.length;
    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);
    const passing = (percentages.filter((p) => p >= 50).length / percentages.length) * 100;

    return { avg: Math.round(avg), highest: Math.round(highest), lowest: Math.round(lowest), passing: Math.round(passing) };
  };

  const getGradeDistribution = () => {
    const filteredGrades = getFilteredGrades();
    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };

    filteredGrades.forEach((g) => {
      const task = tasks.find((t) => t.id === g.taskId);
      if (!task) return;
      const percentage = (g.score / task.maxScore) * 100;

      if (percentage >= 90) distribution.A++;
      else if (percentage >= 80) distribution.B++;
      else if (percentage >= 70) distribution.C++;
      else if (percentage >= 60) distribution.D++;
      else distribution.F++;
    });

    return Object.entries(distribution).map(([grade, count]) => ({
      name: grade,
      value: count,
    }));
  };

  const getStudentPerformance = () => {
    return students.map((student) => {
      const studentGrades = getFilteredGrades().filter((g) => g.studentId === student.id);
      if (studentGrades.length === 0) return { name: student.name.split(" ")[0], average: 0 };

      const avg = studentGrades.reduce((sum, g) => {
        const task = tasks.find((t) => t.id === g.taskId);
        return task ? sum + (g.score / task.maxScore) * 100 : sum;
      }, 0) / studentGrades.length;

      return { name: student.name.split(" ")[0], average: Math.round(avg) };
    }).sort((a, b) => b.average - a.average);
  };

  const getTaskTrends = () => {
    return tasks.map((task) => {
      const taskGrades = grades.filter((g) => g.taskId === task.id);
      if (taskGrades.length === 0) return { name: task.title.substring(0, 10), average: 0 };

      const avg = taskGrades.reduce((sum, g) => sum + (g.score / task.maxScore) * 100, 0) / taskGrades.length;
      return { name: task.title.substring(0, 10), average: Math.round(avg) };
    });
  };

  // ========== BEHAVIOUR LOGIC ==========
  const filteredBehaviour = useMemo(() => {
    if (behaviourPeriod === "all") return behaviour;
    
    const now = new Date();
    const daysAgo = behaviourPeriod === "7days" ? 7 : 30;
    const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    
    return behaviour.filter(b => b.date >= cutoffStr);
  }, [behaviour, behaviourPeriod]);

  const behaviourClassStats = useMemo(() => {
    if (filteredBehaviour.length === 0) return { average: 0, total: 0 };
    
    const total = filteredBehaviour.reduce((sum, b) => sum + RATING_VALUES[b.rating], 0);
    return {
      average: total / filteredBehaviour.length,
      total: filteredBehaviour.length,
    };
  }, [filteredBehaviour]);

  const behaviourRatingDistribution = useMemo(() => {
    const counts: Record<BehaviourRating, number> = {
      excellent: 0,
      good: 0,
      satisfactory: 0,
      needs_improvement: 0,
      poor: 0,
    };
    
    filteredBehaviour.forEach(b => counts[b.rating]++);
    
    return Object.entries(counts).map(([rating, count]) => ({
      name: RATING_LABELS[rating as BehaviourRating],
      value: count,
      rating: rating as BehaviourRating,
    }));
  }, [filteredBehaviour]);

  const behaviourStudentAverages = useMemo(() => {
    const avgMap: Record<string, { total: number; count: number }> = {};
    
    filteredBehaviour.forEach(b => {
      if (!avgMap[b.studentId]) avgMap[b.studentId] = { total: 0, count: 0 };
      avgMap[b.studentId].total += RATING_VALUES[b.rating];
      avgMap[b.studentId].count++;
    });
    
    return students.map(s => ({
      id: s.id,
      name: s.name,
      photo: s.photo,
      average: avgMap[s.id] ? avgMap[s.id].total / avgMap[s.id].count : 0,
      count: avgMap[s.id]?.count || 0,
    })).sort((a, b) => b.average - a.average);
  }, [filteredBehaviour, students]);

  const behaviourTrendData = useMemo(() => {
    const dateMap: Record<string, { total: number; count: number }> = {};
    
    filteredBehaviour.forEach(b => {
      if (!dateMap[b.date]) dateMap[b.date] = { total: 0, count: 0 };
      dateMap[b.date].total += RATING_VALUES[b.rating];
      dateMap[b.date].count++;
    });
    
    return Object.entries(dateMap)
      .map(([date, data]) => ({
        date,
        displayDate: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        average: data.total / data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredBehaviour]);

  const selectedBehaviourStudentData = useMemo(() => {
    if (!selectedBehaviourStudent) return null;
    
    const student = students.find(s => s.id === selectedBehaviourStudent);
    if (!student) return null;
    
    const studentBehaviour = filteredBehaviour.filter(b => b.studentId === selectedBehaviourStudent);
    if (studentBehaviour.length === 0) return { student, records: [], average: 0, trend: "stable" as const, trendLine: [] };
    
    const total = studentBehaviour.reduce((sum, b) => sum + RATING_VALUES[b.rating], 0);
    const average = total / studentBehaviour.length;
    
    const sorted = [...studentBehaviour].sort((a, b) => b.date.localeCompare(a.date));
    let trend: "up" | "down" | "stable" = "stable";
    if (sorted.length >= 4) {
      const recent = sorted.slice(0, Math.ceil(sorted.length / 2));
      const older = sorted.slice(Math.ceil(sorted.length / 2));
      const recentAvg = recent.reduce((s, b) => s + RATING_VALUES[b.rating], 0) / recent.length;
      const olderAvg = older.reduce((s, b) => s + RATING_VALUES[b.rating], 0) / older.length;
      if (recentAvg > olderAvg + 0.3) trend = "up";
      else if (recentAvg < olderAvg - 0.3) trend = "down";
    }
    
    const dateMap: Record<string, { total: number; count: number }> = {};
    studentBehaviour.forEach(b => {
      if (!dateMap[b.date]) dateMap[b.date] = { total: 0, count: 0 };
      dateMap[b.date].total += RATING_VALUES[b.rating];
      dateMap[b.date].count++;
    });
    
    const trendLine = Object.entries(dateMap)
      .map(([date, data]) => ({
        date,
        displayDate: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        score: data.total / data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return { student, records: studentBehaviour, average, trend, trendLine };
  }, [selectedBehaviourStudent, filteredBehaviour, students]);

  const behaviourRadarData = useMemo(() => {
    if (!selectedBehaviourStudent) return [];
    
    const studentRatings: Record<BehaviourRating, number> = {
      excellent: 0, good: 0, satisfactory: 0, needs_improvement: 0, poor: 0,
    };
    const classRatings: Record<BehaviourRating, number> = {
      excellent: 0, good: 0, satisfactory: 0, needs_improvement: 0, poor: 0,
    };
    
    filteredBehaviour.forEach(b => {
      classRatings[b.rating]++;
      if (b.studentId === selectedBehaviourStudent) studentRatings[b.rating]++;
    });
    
    const studentTotal = Object.values(studentRatings).reduce((a, b) => a + b, 0) || 1;
    const classTotal = filteredBehaviour.length || 1;
    
    return Object.keys(RATING_LABELS).map(key => ({
      subject: RATING_LABELS[key as BehaviourRating],
      student: (studentRatings[key as BehaviourRating] / studentTotal) * 100,
      class: (classRatings[key as BehaviourRating] / classTotal) * 100,
    }));
  }, [selectedBehaviourStudent, filteredBehaviour]);

  const getBehaviourScoreLabel = (score: number): { label: string; color: string } => {
    if (score >= 4.5) return { label: "Excellent", color: "text-chart-1" };
    if (score >= 3.5) return { label: "Good", color: "text-chart-2" };
    if (score >= 2.5) return { label: "Satisfactory", color: "text-muted-foreground" };
    if (score >= 1.5) return { label: "Needs Work", color: "text-chart-3" };
    return { label: "Poor", color: "text-destructive" };
  };

  const stats = calculateStats();
  const attStats = getAttendanceStats();
  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={reportTab} onValueChange={setReportTab}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="grades" className="gap-2 px-4 py-2">
            <Award className="h-4 w-4" />
            <span>Grades</span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2 px-4 py-2">
            <Calendar className="h-4 w-4" />
            <span>Attendance</span>
          </TabsTrigger>
          <TabsTrigger value="behaviour" className="gap-2 px-4 py-2">
            <Heart className="h-4 w-4" />
            <span>Behaviour</span>
          </TabsTrigger>
        </TabsList>

        {/* GRADES TAB */}
        <TabsContent value="grades" className="mt-6">
          {grades.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Award className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">No grades yet. Start grading tasks to see reports!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Grade Analytics</h2>
                <Select value={selectedTask} onValueChange={setSelectedTask}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    {tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-none shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Class Average</CardTitle>
                    <Target className="h-5 w-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-card-foreground">{stats.avg}%</div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Highest Score</CardTitle>
                    <TrendingUp className="h-5 w-5 text-chart-1" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-card-foreground">{stats.highest}%</div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Lowest Score</CardTitle>
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-card-foreground">{stats.lowest}%</div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pass Rate</CardTitle>
                    <Award className="h-5 w-5 text-chart-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-card-foreground">{stats.passing}%</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-card-foreground">Student Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getStudentPerformance().slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                        <YAxis dataKey="name" type="category" width={80} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }} 
                        />
                        <Bar dataKey="average" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-card-foreground">Grade Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={getGradeDistribution()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {getGradeDistribution().map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-card-foreground">Performance Trend by Task</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={getTaskTrends()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                        <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }} 
                        />
                        <Line type="monotone" dataKey="average" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ATTENDANCE TAB */}
        <TabsContent value="attendance" className="mt-6 space-y-6">
          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedSubject === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSubject("all")}
              >
                All Subjects
              </Button>
              {subjects.map((subject) => (
                <Button
                  key={subject.id}
                  variant={selectedSubject === subject.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSubject(subject.id)}
                  className={selectedSubject === subject.id ? "" : subject.color}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  {subject.name}
                </Button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-foreground">Attendance Analytics</h2>
            <Select value={attendancePeriod} onValueChange={setAttendancePeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ATTENDANCE_PERIODS.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
                <UserCheck className="h-5 w-5 text-chart-1" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-card-foreground">{attStats.rate}%</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle>
                <Target className="h-5 w-5 text-chart-2" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-card-foreground">{attStats.present}</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle>
                <TrendingDown className="h-5 w-5 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-card-foreground">{attStats.absent}</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Late</CardTitle>
                <TrendingUp className="h-5 w-5 text-chart-3" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-card-foreground">{attStats.late}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-card-foreground">Student Attendance Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getStudentAttendanceData().slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" width={80} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                    formatter={(value: number) => [`${value}%`, "Attendance"]}
                  />
                  <Bar dataKey="rate" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BEHAVIOUR TAB */}
        <TabsContent value="behaviour" className="mt-6 space-y-6">
          {behaviour.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">No behaviour records yet.</p>
                <p className="text-sm text-muted-foreground">Start recording daily behaviour to see analytics.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <h2 className="text-xl font-semibold">Behaviour Analytics</h2>
                <Select value={behaviourPeriod} onValueChange={(v) => setBehaviourPeriod(v as BehaviourPeriod)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Summary Stats */}
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total Records</span>
                    </div>
                    <p className="text-2xl font-bold mt-2">{behaviourClassStats.total}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Class Average</span>
                    </div>
                    <p className={`text-2xl font-bold mt-2 ${getBehaviourScoreLabel(behaviourClassStats.average).color}`}>
                      {behaviourClassStats.average.toFixed(1)} / 5
                    </p>
                    <p className="text-xs text-muted-foreground">{getBehaviourScoreLabel(behaviourClassStats.average).label}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-chart-1" />
                      <span className="text-sm text-muted-foreground">Top Performers</span>
                    </div>
                    <p className="text-2xl font-bold mt-2 text-chart-1">
                      {behaviourStudentAverages.filter(s => s.average >= 4).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Students with 4+ avg</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-destructive" />
                      <span className="text-sm text-muted-foreground">Needs Attention</span>
                    </div>
                    <p className="text-2xl font-bold mt-2 text-destructive">
                      {behaviourStudentAverages.filter(s => s.average > 0 && s.average < 3).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Students below 3 avg</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Class Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Behaviour Trend</CardTitle>
                    <CardDescription>Class average over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {behaviourTrendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={behaviourTrendData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="displayDate" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip 
                            contentStyle={{ 
                              background: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [value.toFixed(2), "Average"]}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="average" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                        No trend data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Rating Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Rating Distribution</CardTitle>
                    <CardDescription>Breakdown by rating category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={behaviourRatingDistribution.filter(d => d.value > 0)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          label={(entry) => entry.name}
                          labelLine={false}
                        >
                          {behaviourRatingDistribution.map((entry, index) => (
                            <Cell key={entry.rating} fill={PIE_COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            background: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Student Comparison Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Student Comparison</CardTitle>
                  <CardDescription>Average behaviour score by student</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={behaviourStudentAverages.slice(0, 15)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" domain={[0, 5]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={100}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [value.toFixed(2), "Average"]}
                      />
                      <Bar 
                        dataKey="average" 
                        fill="hsl(var(--primary))"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Individual Student Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Individual Student Analysis</CardTitle>
                  <CardDescription>Detailed view for a selected student</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <StudentSearchCombobox
                    students={students}
                    value={selectedBehaviourStudent || ""}
                    onValueChange={(val) => setSelectedBehaviourStudent(val || null)}
                    placeholder="Select student..."
                    className="w-full sm:w-[280px]"
                  />

                  {selectedBehaviourStudentData && (
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Student Summary */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={selectedBehaviourStudentData.student.photo} />
                            <AvatarFallback className="text-lg">
                              {selectedBehaviourStudentData.student.name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-lg">{selectedBehaviourStudentData.student.name}</h3>
                            <div className="flex items-center gap-2">
                              <span className={`text-2xl font-bold ${getBehaviourScoreLabel(selectedBehaviourStudentData.average).color}`}>
                                {selectedBehaviourStudentData.average.toFixed(1)}
                              </span>
                              <span className="text-muted-foreground">/ 5</span>
                              {selectedBehaviourStudentData.trend === "up" && (
                                <Badge variant="outline" className="text-chart-1 border-chart-1">
                                  <ArrowUpRight className="h-3 w-3 mr-1" /> Improving
                                </Badge>
                              )}
                              {selectedBehaviourStudentData.trend === "down" && (
                                <Badge variant="outline" className="text-destructive border-destructive">
                                  <ArrowDownRight className="h-3 w-3 mr-1" /> Declining
                                </Badge>
                              )}
                              {selectedBehaviourStudentData.trend === "stable" && (
                                <Badge variant="outline">
                                  <Minus className="h-3 w-3 mr-1" /> Stable
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {selectedBehaviourStudentData.records.length} records
                            </p>
                          </div>
                        </div>

                        {/* Student Trend Line */}
                        {selectedBehaviourStudentData.trendLine && selectedBehaviourStudentData.trendLine.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Score Trend</h4>
                            <ResponsiveContainer width="100%" height={150}>
                              <LineChart data={selectedBehaviourStudentData.trendLine}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                <XAxis dataKey="displayDate" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                                <Tooltip 
                                  contentStyle={{ 
                                    background: 'hsl(var(--card))', 
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px',
                                  }}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="score" 
                                  stroke="hsl(var(--chart-2))" 
                                  strokeWidth={2}
                                  dot={{ fill: 'hsl(var(--chart-2))' }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>

                      {/* Radar Comparison */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Student vs Class Distribution</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <RadarChart data={behaviourRadarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                            <PolarRadiusAxis tick={{ fontSize: 10 }} />
                            <Radar 
                              name="Student" 
                              dataKey="student" 
                              stroke="hsl(var(--chart-2))" 
                              fill="hsl(var(--chart-2))" 
                              fillOpacity={0.5} 
                            />
                            <Radar 
                              name="Class" 
                              dataKey="class" 
                              stroke="hsl(var(--muted-foreground))" 
                              fill="hsl(var(--muted-foreground))" 
                              fillOpacity={0.3} 
                            />
                            <Legend />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Student Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Student Rankings</CardTitle>
                  <CardDescription>Ranked by average behaviour score</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {behaviourStudentAverages.map((student, index) => (
                        <div 
                          key={student.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedBehaviourStudent(student.id)}
                        >
                          <span className={`w-8 text-center font-bold ${
                            index === 0 ? "text-chart-1" : index === 1 ? "text-chart-2" : index === 2 ? "text-chart-3" : "text-muted-foreground"
                          }`}>
                            #{index + 1}
                          </span>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={student.photo} />
                            <AvatarFallback className="text-xs">
                              {student.name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="flex-1 font-medium truncate">{student.name}</span>
                          <div className="text-right">
                            <span className={`font-bold ${getBehaviourScoreLabel(student.average).color}`}>
                              {student.average > 0 ? student.average.toFixed(1) : "-"}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">
                              ({student.count})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
