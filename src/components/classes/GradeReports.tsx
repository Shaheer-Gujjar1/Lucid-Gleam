import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { getStudentsByClass, getTasksByClass, getAllGrades, getAttendanceByClass, getClass, Student, Task, Grade, Attendance, Class, ClassSubject } from "@/lib/db";
import { TrendingUp, TrendingDown, Target, Award, Calendar, UserCheck, BookOpen } from "lucide-react";
import { startOfDay, subDays, subMonths, subYears, parseISO, isSameDay, isAfter } from "date-fns";

interface GradeReportsProps {
  classId: string;
}

export function GradeReports({ classId }: GradeReportsProps) {
  const [classData, setClassData] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [attendancePeriod, setAttendancePeriod] = useState<string>("this_month");
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
      const [s, t, allGrades, allAttendance, classInfo] = await Promise.all([
        getStudentsByClass(classId),
        getTasksByClass(classId),
        getAllGrades(),
        getAttendanceByClass(classId),
        getClass(classId),
      ]);
      setStudents(s);
      setTasks(t);
      setAttendance(allAttendance);
      setClassData(classInfo || null);
      
      const studentIds = new Set(s.map((st) => st.id));
      const taskIds = new Set(t.map((tk) => tk.id));
      const classGrades = allGrades.filter(
        (g) => studentIds.has(g.studentId) && taskIds.has(g.taskId)
      );
      setGrades(classGrades);
      setLoading(false);
    }
    loadData();
  }, [classId]);

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
    
    // Filter by date - use isSameDay OR isAfter to include today's records
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

  const getFilteredGrades = () => {
    if (selectedTask === "all") return grades;
    return grades.filter((g) => g.taskId === selectedTask);
  };

  const calculateStats = () => {
    const filteredGrades = getFilteredGrades();
    // Only calculate stats for tasks with maxScore
    const validGrades = filteredGrades.filter(g => {
      const task = tasks.find(t => t.id === g.taskId);
      return task && task.maxScore;
    });
    if (validGrades.length === 0) return { avg: 0, highest: 0, lowest: 0, passing: 0 };

    const percentages = validGrades.map((g) => {
      const task = tasks.find((t) => t.id === g.taskId);
      return task && task.maxScore ? (g.score / task.maxScore) * 100 : 0;
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
      if (!task || !task.maxScore) return;
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
      const validGrades = studentGrades.filter(g => {
        const task = tasks.find(t => t.id === g.taskId);
        return task && task.maxScore;
      });
      if (validGrades.length === 0) return { name: student.name.split(" ")[0], average: 0 };

      const avg = validGrades.reduce((sum, g) => {
        const task = tasks.find((t) => t.id === g.taskId);
        return task && task.maxScore ? sum + (g.score / task.maxScore) * 100 : sum;
      }, 0) / validGrades.length;

      return { name: student.name.split(" ")[0], average: Math.round(avg) };
    }).sort((a, b) => b.average - a.average);
  };

  const getTaskTrends = () => {
    // Only show tasks with maxScore
    return tasks.filter(t => t.maxScore).map((task) => {
      const taskGrades = grades.filter((g) => g.taskId === task.id);
      if (taskGrades.length === 0 || !task.maxScore) return { name: task.title.substring(0, 10), average: 0 };

      const avg = taskGrades.reduce((sum, g) => sum + (g.score / task.maxScore!) * 100, 0) / taskGrades.length;
      return { name: task.title.substring(0, 10), average: Math.round(avg) };
    });
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
        </TabsList>

        <TabsContent value="grades" className="mt-6">
          {grades.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12">
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

        <TabsContent value="attendance" className="mt-6 space-y-6">
          {/* Subject Filter */}
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
      </Tabs>
    </div>
  );
}