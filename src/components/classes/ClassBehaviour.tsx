import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import {
  Student,
  Behaviour,
  BehaviourRating,
  getStudentsByClass,
  getBehaviourByDate,
  upsertBehaviour,
} from "@/lib/db";

interface ClassBehaviourProps {
  classId: string;
}

const RATING_OPTIONS: { value: BehaviourRating; label: string; color: string }[] = [
  { value: "excellent", label: "Excellent", color: "bg-chart-1/20 text-chart-1" },
  { value: "good", label: "Good", color: "bg-chart-2/20 text-chart-2" },
  { value: "satisfactory", label: "Satisfactory", color: "bg-muted text-muted-foreground" },
  { value: "needs_improvement", label: "Needs Improvement", color: "bg-chart-3/20 text-chart-3" },
  { value: "poor", label: "Poor", color: "bg-destructive/20 text-destructive" },
];

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ClassBehaviour({ classId }: ClassBehaviourProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date()));
  const [behaviour, setBehaviour] = useState<Record<string, { rating: BehaviourRating; comments: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadStudents();
  }, [classId]);

  useEffect(() => {
    if (students.length > 0) {
      loadBehaviour();
    }
  }, [selectedDate, students]);

  async function loadStudents() {
    const data = await getStudentsByClass(classId);
    setStudents(data.sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  }

  async function loadBehaviour() {
    const records = await getBehaviourByDate(classId, selectedDate);
    const map: Record<string, { rating: BehaviourRating; comments: string }> = {};
    
    // Initialize all students with default "satisfactory"
    students.forEach(s => {
      map[s.id] = { rating: "satisfactory", comments: "" };
    });
    
    // Override with saved records
    records.forEach(r => {
      map[r.studentId] = { rating: r.rating, comments: r.comments || "" };
    });
    
    setBehaviour(map);
  }

  const handleRatingChange = async (studentId: string, rating: BehaviourRating) => {
    setSaving(prev => ({ ...prev, [studentId]: true }));
    const current = behaviour[studentId] || { rating: "satisfactory", comments: "" };
    setBehaviour(prev => ({ ...prev, [studentId]: { ...current, rating } }));
    
    try {
      await upsertBehaviour(classId, studentId, selectedDate, rating, current.comments);
      toast.success("Behaviour saved");
    } catch (error) {
      toast.error("Failed to save behaviour");
    } finally {
      setSaving(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const handleCommentsChange = async (studentId: string, comments: string) => {
    const current = behaviour[studentId] || { rating: "satisfactory" as BehaviourRating, comments: "" };
    setBehaviour(prev => ({ ...prev, [studentId]: { ...current, comments } }));
  };

  const saveComments = async (studentId: string) => {
    setSaving(prev => ({ ...prev, [studentId]: true }));
    const current = behaviour[studentId] || { rating: "satisfactory" as BehaviourRating, comments: "" };
    
    try {
      await upsertBehaviour(classId, studentId, selectedDate, current.rating, current.comments);
      toast.success("Comments saved");
    } catch (error) {
      toast.error("Failed to save comments");
    } finally {
      setSaving(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(formatDateForInput(date));
  };

  const getRatingColor = (rating?: BehaviourRating) => {
    return RATING_OPTIONS.find(r => r.value === rating)?.color || "bg-muted";
  };

  const getStats = () => {
    const values = Object.values(behaviour);
    return {
      excellent: values.filter(b => b.rating === "excellent").length,
      good: values.filter(b => b.rating === "good").length,
      satisfactory: values.filter(b => b.rating === "satisfactory").length,
      needs_improvement: values.filter(b => b.rating === "needs_improvement").length,
      poor: values.filter(b => b.rating === "poor").length,
    };
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
          <p className="text-lg text-muted-foreground">
            Add students first to track behaviour.
          </p>
        </CardContent>
      </Card>
    );
  }

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-5">
        <Card className="border-none shadow">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-chart-1">{stats.excellent}</p>
            <p className="text-xs text-muted-foreground">Excellent</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-chart-2">{stats.good}</p>
            <p className="text-xs text-muted-foreground">Good</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{stats.satisfactory}</p>
            <p className="text-xs text-muted-foreground">Satisfactory</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-chart-3">{stats.needs_improvement}</p>
            <p className="text-xs text-muted-foreground">Needs Work</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.poor}</p>
            <p className="text-xs text-muted-foreground">Poor</p>
          </CardContent>
        </Card>
      </div>

      {/* Behaviour Table */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-card-foreground">
            {formatDateDisplay(selectedDate)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="w-[180px]">Behaviour</TableHead>
                <TableHead>Comments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                const record = behaviour[student.id] || { rating: "satisfactory", comments: "" };
                const isSaving = saving[student.id];
                const isExpanded = expandedComments[student.id];
                
                return (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {student.photo ? (
                          <img
                            src={student.photo}
                            alt={student.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-foreground">{student.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={record.rating}
                        onValueChange={(value) => handleRatingChange(student.id, value as BehaviourRating)}
                        disabled={isSaving}
                      >
                        <SelectTrigger className={`w-[160px] ${getRatingColor(record.rating)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RATING_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <div className="flex-1 flex gap-2">
                            <Textarea
                              value={record.comments}
                              onChange={(e) => handleCommentsChange(student.id, e.target.value)}
                              placeholder="Add comments..."
                              className="min-h-[60px] text-sm"
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                saveComments(student.id);
                                setExpandedComments(prev => ({ ...prev, [student.id]: false }));
                              }}
                              disabled={isSaving}
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <>
                            {record.comments ? (
                              <Badge 
                                variant="secondary" 
                                className="cursor-pointer max-w-[200px] truncate"
                                onClick={() => setExpandedComments(prev => ({ ...prev, [student.id]: true }))}
                              >
                                {record.comments}
                              </Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground"
                                onClick={() => setExpandedComments(prev => ({ ...prev, [student.id]: true }))}
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Add comment
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}