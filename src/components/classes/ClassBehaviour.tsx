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
import { ChevronLeft, ChevronRight, Calendar, MessageSquare, BookOpen, Clock, Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Student,
  Behaviour,
  BehaviourRating,
  Class,
  ClassSubject,
  LecturePeriod,
  getStudentsByClass,
  getBehaviourByDate,
  upsertBehaviour,
  getBehaviourLecturesForDate,
  getClass,
} from "@/lib/db";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function ClassBehaviour({ classId }: ClassBehaviourProps) {
  const [classData, setClassData] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date()));
  const [selectedLecture, setSelectedLecture] = useState<number>(1);
  const [selectedSubject, setSelectedSubject] = useState<ClassSubject | null>(null);
  const [lectureTime, setLectureTime] = useState<string>(getCurrentTime());
  const [existingLectures, setExistingLectures] = useState<number[]>([]);
  const [behaviour, setBehaviour] = useState<Record<string, { rating: BehaviourRating; comments: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Derived values from schedule
  const subjects = classData?.subjects || [];
  const hasSubjects = subjects.length > 0;
  const lecturePeriods = classData?.lecturePeriods || [];
  const lectureCount = lecturePeriods.length;
  const hasSchedule = lectureCount > 0;

  useEffect(() => {
    loadInitialData();
  }, [classId]);

  useEffect(() => {
    if (students.length > 0 && classData) {
      loadLecturesAndBehaviour();
    }
  }, [selectedDate, students, classData]);

  useEffect(() => {
    if (students.length > 0 && classData) {
      loadBehaviour();
    }
  }, [selectedLecture, selectedSubject]);

  async function loadInitialData() {
    const [studentsData, classInfo] = await Promise.all([
      getStudentsByClass(classId),
      getClass(classId),
    ]);
    
    setStudents(studentsData.sort((a, b) => a.name.localeCompare(b.name)));
    setClassData(classInfo || null);
    
    // Auto-select first subject if available
    if (classInfo?.subjects && classInfo.subjects.length > 0) {
      setSelectedSubject(classInfo.subjects[0]);
    }
    
    // Set initial lecture time from schedule if available
    if (classInfo?.lecturePeriods && classInfo.lecturePeriods.length > 0) {
      setLectureTime(classInfo.lecturePeriods[0].startTime);
    }
    
    setLoading(false);
  }

  async function loadLecturesAndBehaviour() {
    const lectures = await getBehaviourLecturesForDate(classId, selectedDate, selectedSubject?.id);
    setExistingLectures(lectures);
    
    // Auto-select first existing lecture or default to 1
    if (lectures.length > 0 && !lectures.includes(selectedLecture)) {
      setSelectedLecture(lectures[0]);
    }
    
    await loadBehaviour();
  }

  async function loadBehaviour() {
    const records = await getBehaviourByDate(classId, selectedDate, selectedLecture, selectedSubject?.id);
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
    
    // Set time from first record if exists, or from schedule
    if (records.length > 0 && records[0].time) {
      setLectureTime(records[0].time);
    } else if (lecturePeriods[selectedLecture - 1]) {
      setLectureTime(lecturePeriods[selectedLecture - 1].startTime);
    }
  }

  const handleRatingChange = async (studentId: string, rating: BehaviourRating) => {
    setSaving(prev => ({ ...prev, [studentId]: true }));
    const current = behaviour[studentId] || { rating: "satisfactory", comments: "" };
    setBehaviour(prev => ({ ...prev, [studentId]: { ...current, rating } }));
    
    try {
      await upsertBehaviour(
        classId,
        studentId,
        selectedDate,
        selectedLecture,
        rating,
        lectureTime,
        selectedSubject?.id,
        selectedSubject?.name,
        current.comments
      );
      
      // Refresh existing lectures list
      const lectures = await getBehaviourLecturesForDate(classId, selectedDate, selectedSubject?.id);
      setExistingLectures(lectures);
      
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
      await upsertBehaviour(
        classId,
        studentId,
        selectedDate,
        selectedLecture,
        current.rating,
        lectureTime,
        selectedSubject?.id,
        selectedSubject?.name,
        current.comments
      );
      toast.success("Comments saved");
    } catch (error) {
      toast.error("Failed to save comments");
    } finally {
      setSaving(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const handleLectureChange = (lectureNum: number) => {
    setSelectedLecture(lectureNum);
    // Auto-set time from schedule
    const periodTime = lecturePeriods[lectureNum - 1]?.startTime;
    if (periodTime) {
      setLectureTime(periodTime);
    }
  };

  const startNewLecture = () => {
    // Find next available lecture number
    const availableLectures = Array.from({ length: lectureCount }, (_, i) => i + 1);
    const nextLecture = availableLectures.find(l => !existingLectures.includes(l)) || selectedLecture + 1;
    setSelectedLecture(Math.min(nextLecture, lectureCount));
    
    // Set time from schedule if available
    const periodTime = lecturePeriods[nextLecture - 1]?.startTime;
    setLectureTime(periodTime || getCurrentTime());
    setBehaviour({});
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(formatDateForInput(date));
    setSelectedLecture(1);
    // Reset time from schedule
    const periodTime = lecturePeriods[0]?.startTime;
    setLectureTime(periodTime || getCurrentTime());
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

  const getLectureTimeDisplay = (lectureNum: number): string => {
    const period = lecturePeriods[lectureNum - 1];
    if (period) {
      return `${period.startTime} - ${period.endTime}`;
    }
    return "";
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

  if (!hasSchedule) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground text-center">
            No lecture schedule configured.
          </p>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Go to the "Schedule" tab to add subjects and lecture timings first.
          </p>
        </CardContent>
      </Card>
    );
  }

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Setup Alert */}
      {!hasSubjects && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">Tip:</span> Go to the "Schedule" tab to add subjects and configure lecture timings for this class.
          </AlertDescription>
        </Alert>
      )}

      {/* Subject Selection (if multiple subjects) */}
      {hasSubjects && (
        <div className="flex flex-wrap gap-2">
          {subjects.map((subject) => (
            <Button
              key={subject.id}
              variant={selectedSubject?.id === subject.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSubject(subject)}
              className={selectedSubject?.id === subject.id ? "" : subject.color}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              {subject.name}
            </Button>
          ))}
        </div>
      )}

      {/* Date & Lecture Navigation */}
      <div className="flex flex-col gap-4">
        {/* Date Row */}
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

        {/* Lecture & Time Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Lecture Selector */}
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <Select
                value={String(selectedLecture)}
                onValueChange={(v) => handleLectureChange(Number(v))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Lecture" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: lectureCount }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>Lecture {num}</span>
                        {existingLectures.includes(num) && <span className="text-chart-1">✓</span>}
                        {getLectureTimeDisplay(num) && (
                          <span className="text-xs text-muted-foreground">
                            {getLectureTimeDisplay(num)}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Input */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={lectureTime}
                onChange={(e) => setLectureTime(e.target.value)}
                className="w-[120px]"
              />
            </div>

            {/* Existing Lectures Indicator */}
            {existingLectures.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Recorded:</span>
                {existingLectures.map((l) => (
                  <Button
                    key={l}
                    variant={l === selectedLecture ? "default" : "outline"}
                    size="sm"
                    className="h-6 w-6 p-0 text-xs"
                    onClick={() => handleLectureChange(l)}
                  >
                    {l}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* New Lecture Button */}
          <Button variant="outline" onClick={startNewLecture} className="gap-2">
            <Plus className="h-4 w-4" />
            New Lecture
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-2 sm:gap-4 grid-cols-3 sm:grid-cols-5">
        <Card className="border-none shadow">
          <CardContent className="p-2 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-chart-1">{stats.excellent}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Excellent</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow">
          <CardContent className="p-2 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-chart-2">{stats.good}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Good</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow">
          <CardContent className="p-2 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-muted-foreground">{stats.satisfactory}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Satisfactory</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow">
          <CardContent className="p-2 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-chart-3">{stats.needs_improvement}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Needs Work</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow">
          <CardContent className="p-2 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-destructive">{stats.poor}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Poor</p>
          </CardContent>
        </Card>
      </div>

      {/* Behaviour Table */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-card-foreground flex flex-col sm:flex-row sm:items-center gap-2">
            <span>{formatDateDisplay(selectedDate)}</span>
            <div className="flex items-center gap-2 text-sm font-normal">
              <Badge variant="secondary">
                Lecture {selectedLecture}
                {getLectureTimeDisplay(selectedLecture) && ` (${getLectureTimeDisplay(selectedLecture)})`}
              </Badge>
              {selectedSubject && (
                <Badge className={selectedSubject.color}>
                  {selectedSubject.name}
                </Badge>
              )}
            </div>
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