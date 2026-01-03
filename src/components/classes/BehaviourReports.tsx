import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, Minus, Users, Calendar, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, PieChart, Pie, Cell } from "recharts";
import {
  Student,
  Behaviour,
  BehaviourRating,
  Class,
  getStudentsByClass,
  getBehaviourByClass,
  getClass,
} from "@/lib/db";
import { StudentSearchCombobox } from "./StudentSearchCombobox";

interface BehaviourReportsProps {
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

const RATING_COLORS: Record<BehaviourRating, string> = {
  excellent: "hsl(var(--chart-1))",
  good: "hsl(var(--chart-2))",
  satisfactory: "hsl(var(--muted-foreground))",
  needs_improvement: "hsl(var(--chart-3))",
  poor: "hsl(var(--destructive))",
};

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--chart-3))",
  "hsl(var(--destructive))",
];

type Period = "7days" | "30days" | "all";

export function BehaviourReports({ classId }: BehaviourReportsProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [behaviour, setBehaviour] = useState<Behaviour[]>([]);
  const [classData, setClassData] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("30days");

  useEffect(() => {
    loadData();
  }, [classId]);

  async function loadData() {
    const [studentsData, behaviourData, classInfo] = await Promise.all([
      getStudentsByClass(classId),
      getBehaviourByClass(classId),
      getClass(classId),
    ]);
    
    setStudents(studentsData.sort((a, b) => a.name.localeCompare(b.name)));
    setBehaviour(behaviourData);
    setClassData(classInfo || null);
    
    if (studentsData.length > 0) {
      setSelectedStudent(studentsData[0].id);
    }
    
    setLoading(false);
  }

  const filteredBehaviour = useMemo(() => {
    if (period === "all") return behaviour;
    
    const now = new Date();
    const daysAgo = period === "7days" ? 7 : 30;
    const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    
    return behaviour.filter(b => b.date >= cutoffStr);
  }, [behaviour, period]);

  // Overall class statistics
  const classStats = useMemo(() => {
    if (filteredBehaviour.length === 0) return { average: 0, total: 0 };
    
    const total = filteredBehaviour.reduce((sum, b) => sum + RATING_VALUES[b.rating], 0);
    return {
      average: total / filteredBehaviour.length,
      total: filteredBehaviour.length,
    };
  }, [filteredBehaviour]);

  // Distribution by rating
  const ratingDistribution = useMemo(() => {
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

  // Student averages for comparison
  const studentAverages = useMemo(() => {
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

  // Trend data for line chart (last 7/30 days)
  const trendData = useMemo(() => {
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

  // Selected student data
  const selectedStudentData = useMemo(() => {
    if (!selectedStudent) return null;
    
    const student = students.find(s => s.id === selectedStudent);
    if (!student) return null;
    
    const studentBehaviour = filteredBehaviour.filter(b => b.studentId === selectedStudent);
    if (studentBehaviour.length === 0) return { student, records: [], average: 0, trend: "stable" as const };
    
    const total = studentBehaviour.reduce((sum, b) => sum + RATING_VALUES[b.rating], 0);
    const average = total / studentBehaviour.length;
    
    // Calculate trend (compare last 3 records with previous 3)
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
    
    // Student trend over time
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
  }, [selectedStudent, filteredBehaviour, students]);

  // Radar data for student vs class average
  const radarData = useMemo(() => {
    if (!selectedStudent) return [];
    
    // Get student's rating distribution
    const studentRatings: Record<BehaviourRating, number> = {
      excellent: 0, good: 0, satisfactory: 0, needs_improvement: 0, poor: 0,
    };
    const classRatings: Record<BehaviourRating, number> = {
      excellent: 0, good: 0, satisfactory: 0, needs_improvement: 0, poor: 0,
    };
    
    filteredBehaviour.forEach(b => {
      classRatings[b.rating]++;
      if (b.studentId === selectedStudent) studentRatings[b.rating]++;
    });
    
    const studentTotal = Object.values(studentRatings).reduce((a, b) => a + b, 0) || 1;
    const classTotal = filteredBehaviour.length || 1;
    
    return Object.keys(RATING_LABELS).map(key => ({
      subject: RATING_LABELS[key as BehaviourRating],
      student: (studentRatings[key as BehaviourRating] / studentTotal) * 100,
      class: (classRatings[key as BehaviourRating] / classTotal) * 100,
    }));
  }, [selectedStudent, filteredBehaviour]);

  const getScoreLabel = (score: number): { label: string; color: string } => {
    if (score >= 4.5) return { label: "Excellent", color: "text-chart-1" };
    if (score >= 3.5) return { label: "Good", color: "text-chart-2" };
    if (score >= 2.5) return { label: "Satisfactory", color: "text-muted-foreground" };
    if (score >= 1.5) return { label: "Needs Work", color: "text-chart-3" };
    return { label: "Poor", color: "text-destructive" };
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (behaviour.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">No behaviour records yet.</p>
          <p className="text-sm text-muted-foreground">Start recording daily behaviour to see analytics.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <h2 className="text-xl font-semibold">Behaviour Analytics</h2>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
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
            <p className="text-2xl font-bold mt-2">{classStats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Class Average</span>
            </div>
            <p className={`text-2xl font-bold mt-2 ${getScoreLabel(classStats.average).color}`}>
              {classStats.average.toFixed(1)} / 5
            </p>
            <p className="text-xs text-muted-foreground">{getScoreLabel(classStats.average).label}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-chart-1" />
              <span className="text-sm text-muted-foreground">Top Performers</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-chart-1">
              {studentAverages.filter(s => s.average >= 4).length}
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
              {studentAverages.filter(s => s.average > 0 && s.average < 3).length}
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
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
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
                  data={ratingDistribution.filter(d => d.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  label={(entry) => entry.name}
                  labelLine={false}
                >
                  {ratingDistribution.map((entry, index) => (
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
            <BarChart data={studentAverages.slice(0, 15)} layout="vertical">
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
          {/* Student Selector */}
          <StudentSearchCombobox
            students={students}
            value={selectedStudent || ""}
            onValueChange={(val) => setSelectedStudent(val || null)}
            placeholder="Select student..."
            className="w-full sm:w-[280px]"
          />

          {selectedStudentData && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Student Summary */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedStudentData.student.photo} />
                    <AvatarFallback className="text-lg">
                      {selectedStudentData.student.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedStudentData.student.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${getScoreLabel(selectedStudentData.average).color}`}>
                        {selectedStudentData.average.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">/ 5</span>
                      {selectedStudentData.trend === "up" && (
                        <Badge variant="outline" className="text-chart-1 border-chart-1">
                          <ArrowUpRight className="h-3 w-3 mr-1" /> Improving
                        </Badge>
                      )}
                      {selectedStudentData.trend === "down" && (
                        <Badge variant="outline" className="text-destructive border-destructive">
                          <ArrowDownRight className="h-3 w-3 mr-1" /> Declining
                        </Badge>
                      )}
                      {selectedStudentData.trend === "stable" && (
                        <Badge variant="outline">
                          <Minus className="h-3 w-3 mr-1" /> Stable
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedStudentData.records.length} records
                    </p>
                  </div>
                </div>

                {/* Student Trend Line */}
                {selectedStudentData.trendLine && selectedStudentData.trendLine.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Score Trend</h4>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={selectedStudentData.trendLine}>
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
                  <RadarChart data={radarData}>
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
              {studentAverages.map((student, index) => (
                <div 
                  key={student.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedStudent(student.id)}
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
                    <span className={`font-bold ${getScoreLabel(student.average).color}`}>
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
    </div>
  );
}
