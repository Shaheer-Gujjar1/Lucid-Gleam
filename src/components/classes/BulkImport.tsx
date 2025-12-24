import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { addStudent, getAllClasses, Class } from "@/lib/db";
import { Upload, FileSpreadsheet, Users, CheckCircle, XCircle, AlertCircle, Download } from "lucide-react";

interface BulkImportProps {
  classId?: string;
  onImportComplete?: () => void;
}

interface ImportStudent {
  name: string;
  email?: string;
  status: "pending" | "success" | "error";
  error?: string;
}

export function BulkImport({ classId: initialClassId, onImportComplete }: BulkImportProps) {
  const [importData, setImportData] = useState<ImportStudent[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(initialClassId || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initialClassId) {
      getAllClasses().then(setClasses);
    }
  }, [initialClassId]);

  const parseCSV = (content: string): ImportStudent[] => {
    const lines = content.trim().split("\n");
    const students: ImportStudent[] = [];
    lines.forEach((line, index) => {
      if (index === 0 && (line.toLowerCase().includes("name") || line.toLowerCase().includes("email"))) return;
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      if (values[0]) students.push({ name: values[0], email: values[1] || undefined, status: "pending" });
    });
    return students;
  };

  const parseText = (text: string): ImportStudent[] => {
    return text.trim().split("\n").map((line) => line.trim()).filter((line) => line.length > 0).map((line) => {
      const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/);
      const email = emailMatch ? emailMatch[0] : undefined;
      const name = email ? line.replace(email, "").trim().replace(/[,;]/, "").trim() : line;
      return { name: name || line, email, status: "pending" as const };
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const parsed = parseCSV(event.target?.result as string);
      setImportData(parsed);
      toast.success(`Parsed ${parsed.length} students from file`);
    };
    reader.readAsText(file);
  };

  const handleTextParse = () => {
    if (!textInput.trim()) { toast.error("Please enter student names"); return; }
    const parsed = parseText(textInput);
    setImportData(parsed);
    toast.success(`Parsed ${parsed.length} students`);
  };

  const handleImport = async () => {
    const targetClassId = initialClassId || selectedClassId;
    if (!targetClassId) { toast.error("Please select a class first"); return; }
    if (importData.length === 0) { toast.error("No students to import"); return; }
    setIsImporting(true);
    const updated = [...importData];
    let successCount = 0, errorCount = 0;
    for (let i = 0; i < updated.length; i++) {
      try {
        await addStudent({ classId: targetClassId, name: updated[i].name, email: updated[i].email });
        updated[i].status = "success";
        successCount++;
      } catch { updated[i].status = "error"; errorCount++; }
      setImportData([...updated]);
    }
    setIsImporting(false);
    toast.success(`Imported ${successCount} students${errorCount > 0 ? `, ${errorCount} failed` : ""}`);
    onImportComplete?.();
  };

  const downloadTemplate = () => {
    const csv = "Name,Email\nJohn Doe,john@example.com\nJane Smith,jane@example.com";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "student_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const clearData = () => { setImportData([]); setTextInput(""); if (fileInputRef.current) fileInputRef.current.value = ""; };
  const getStatusIcon = (status: string) => {
    if (status === "success") return <CheckCircle className="h-4 w-4 text-chart-1" />;
    if (status === "error") return <XCircle className="h-4 w-4 text-destructive" />;
    return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground"><Upload className="h-5 w-5" />Bulk Import Students</CardTitle>
          <CardDescription>Import multiple students at once from a CSV file or text list</CardDescription>
        </CardHeader>
        <CardContent>
          {!initialClassId && classes.length > 0 && (
            <div className="mb-4">
              <Label htmlFor="class-select">Select Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger id="class-select" className="mt-2"><SelectValue placeholder="Choose a class" /></SelectTrigger>
                <SelectContent>{classes.map((cls) => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <Tabs defaultValue="file" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file" className="gap-2"><FileSpreadsheet className="h-4 w-4" />CSV File</TabsTrigger>
              <TabsTrigger value="text" className="gap-2"><Users className="h-4 w-4" />Text List</TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="space-y-4 mt-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="csv-file">Upload CSV File</Label>
                  <Input id="csv-file" ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} className="mt-2" />
                </div>
                <Button variant="outline" onClick={downloadTemplate} className="mt-6 gap-2"><Download className="h-4 w-4" />Template</Button>
              </div>
              <p className="text-sm text-muted-foreground">CSV format: Name,Email (first row can be header)</p>
            </TabsContent>
            <TabsContent value="text" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="text-input">Student Names (one per line)</Label>
                <textarea id="text-input" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="John Doe, john@example.com&#10;Jane Smith" className="mt-2 w-full h-40 rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <Button onClick={handleTextParse} className="gap-2"><Users className="h-4 w-4" />Parse Students</Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      {importData.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-card-foreground">Preview ({importData.length} students)</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearData}>Clear</Button>
                <Button onClick={handleImport} disabled={isImporting} className="gap-2">
                  {isImporting ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Importing...</> : <><Upload className="h-4 w-4" />Import All</>}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {importData.map((student, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg bg-background p-3">
                  <div className="flex items-center gap-3">{getStatusIcon(student.status)}<div><p className="font-medium text-foreground">{student.name}</p>{student.email && <p className="text-sm text-muted-foreground">{student.email}</p>}</div></div>
                  <Badge variant={student.status === "success" ? "default" : student.status === "error" ? "destructive" : "secondary"}>{student.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
