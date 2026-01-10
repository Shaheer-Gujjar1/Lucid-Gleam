import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { addStudent, getAllClasses, getAllInstitutes, Class, Institute } from "@/lib/db";
import { Upload, FileSpreadsheet, Users, CheckCircle, XCircle, AlertCircle, Download, ChevronsUpDown, Check, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

interface BulkImportProps {
  classId?: string;
  onImportComplete?: () => void;
}

interface ImportStudent {
  name: string;
  email?: string;
  status: "pending" | "success" | "error" | "invalid";
  error?: string;
}

// Validation schema for student data
const studentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(100, "Name must be less than 100 characters")
    .refine(
      (val) => !/[<>{}[\]\\]/.test(val),
      "Name contains invalid characters"
    ),
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters")
    .optional()
    .or(z.literal("")),
});

const MAX_IMPORT_SIZE = 500; // Maximum students per import

export function BulkImport({ classId: initialClassId, onImportComplete }: BulkImportProps) {
  const [importData, setImportData] = useState<ImportStudent[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [classes, setClasses] = useState<Class[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(initialClassId || "");
  const [classSearchOpen, setClassSearchOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initialClassId) {
      Promise.all([getAllClasses(), getAllInstitutes()]).then(([classesData, institutesData]) => {
        setClasses(classesData);
        setInstitutes(institutesData);
      });
    }
  }, [initialClassId]);

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const getInstituteName = (instituteId: string) => institutes.find(i => i.id === instituteId)?.name || "";

  const validateStudent = (name: string, email?: string): { valid: boolean; name: string; email?: string; error?: string } => {
    const trimmedName = name.trim();
    const trimmedEmail = email?.trim() || undefined;
    
    const result = studentSchema.safeParse({ 
      name: trimmedName, 
      email: trimmedEmail || "" 
    });
    
    if (!result.success) {
      const errors = result.error.errors.map(e => e.message).join(", ");
      return { valid: false, name: trimmedName, email: trimmedEmail, error: errors };
    }
    
    return { valid: true, name: trimmedName, email: trimmedEmail || undefined };
  };

  const parseCSV = (content: string): ImportStudent[] => {
    const lines = content.trim().split("\n");
    const students: ImportStudent[] = [];
    
    // Check size limit
    if (lines.length > MAX_IMPORT_SIZE + 1) {
      toast.error(`Maximum ${MAX_IMPORT_SIZE} students allowed per import`);
      return [];
    }
    
    lines.forEach((line, index) => {
      // Skip header row
      if (index === 0 && (line.toLowerCase().includes("name") || line.toLowerCase().includes("email"))) return;
      
      // Parse CSV values, handling quoted values properly
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      
      if (!values[0]?.trim()) return; // Skip empty rows
      
      const validation = validateStudent(values[0], values[1]);
      
      if (validation.valid) {
        students.push({ 
          name: validation.name, 
          email: validation.email, 
          status: "pending" 
        });
      } else {
        students.push({ 
          name: validation.name || `Row ${index + 1}`, 
          email: validation.email, 
          status: "invalid",
          error: validation.error
        });
      }
    });
    
    return students;
  };

  const parseText = (text: string): ImportStudent[] => {
    const lines = text.trim().split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
    
    // Check size limit
    if (lines.length > MAX_IMPORT_SIZE) {
      toast.error(`Maximum ${MAX_IMPORT_SIZE} students allowed per import`);
      return [];
    }
    
    return lines.map((line) => {
      const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/);
      const email = emailMatch ? emailMatch[0] : undefined;
      const name = email ? line.replace(email, "").trim().replace(/[,;]/, "").trim() : line;
      
      const validation = validateStudent(name || line, email);
      
      if (validation.valid) {
        return { name: validation.name, email: validation.email, status: "pending" as const };
      } else {
        return { 
          name: validation.name || line, 
          email: validation.email, 
          status: "invalid" as const,
          error: validation.error
        };
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const parsed = parseCSV(event.target?.result as string);
      setImportData(parsed);
      toast.info(`${parsed.length} students ready to import. Click "Import All" to add them to the class.`);
    };
    reader.readAsText(file);
  };

  const handleTextParse = () => {
    if (!textInput.trim()) { toast.error("Please enter student names"); return; }
    const parsed = parseText(textInput);
    setImportData(parsed);
    toast.info(`${parsed.length} students ready to import. Click "Import All" to add them to the class.`);
  };

  const handleImport = async () => {
    const targetClassId = initialClassId || selectedClassId;
    if (!targetClassId) { toast.error("Please select a class first"); return; }
    if (importData.length === 0) { toast.error("No students to import"); return; }
    
    // Filter out invalid entries
    const validStudents = importData.filter(s => s.status === "pending");
    const invalidCount = importData.filter(s => s.status === "invalid").length;
    
    if (validStudents.length === 0) {
      toast.error("No valid students to import. Please fix validation errors.");
      return;
    }
    
    if (invalidCount > 0) {
      toast.warning(`Skipping ${invalidCount} invalid entries`);
    }
    
    setIsImporting(true);
    const updated = [...importData];
    let successCount = 0, errorCount = 0;
    
    for (let i = 0; i < updated.length; i++) {
      // Skip invalid entries
      if (updated[i].status === "invalid") continue;
      
      try {
        await addStudent({ classId: targetClassId, name: updated[i].name, email: updated[i].email });
        updated[i].status = "success";
        successCount++;
      } catch { 
        updated[i].status = "error"; 
        errorCount++; 
      }
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
    if (status === "invalid") return <XCircle className="h-4 w-4 text-amber-500" />;
    return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  };
  
  const invalidCount = importData.filter(s => s.status === "invalid").length;
  const validCount = importData.filter(s => s.status === "pending").length;

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground"><Upload className="h-5 w-5" />Bulk Import Students</CardTitle>
          <CardDescription>Import multiple students at once from a CSV file or text list</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Searchable Class Selector */}
          {!initialClassId && (
            <div className="mb-6">
              <Label className="text-sm font-medium mb-2 block text-foreground">Select Class <span className="text-destructive">*</span></Label>
              {!selectedClassId && importData.length > 0 && (
                <p className="text-sm text-destructive mb-2">⚠️ You must select a class to enable the Import button</p>
              )}
              <Popover open={classSearchOpen} onOpenChange={setClassSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={classSearchOpen}
                    className="w-full justify-between"
                  >
                    {selectedClass ? (
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        {selectedClass.name}
                        {getInstituteName(selectedClass.instituteId) && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {getInstituteName(selectedClass.instituteId)}
                          </Badge>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Search and select a class...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-popover" align="start">
                  <Command>
                    <CommandInput placeholder="Search classes..." />
                    <CommandList>
                      <CommandEmpty>No class found.</CommandEmpty>
                      <CommandGroup>
                        {classes.map((cls) => (
                          <CommandItem
                            key={cls.id}
                            value={`${cls.name} ${getInstituteName(cls.instituteId)}`}
                            onSelect={() => {
                              setSelectedClassId(cls.id);
                              setClassSearchOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedClassId === cls.id ? "opacity-100" : "opacity-0")} />
                            <BookOpen className="mr-2 h-4 w-4" />
                            <span>{cls.name}</span>
                            {getInstituteName(cls.instituteId) && (
                              <Badge variant="secondary" className="ml-auto text-xs">
                                {getInstituteName(cls.instituteId)}
                              </Badge>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {classes.length === 0 && (
                <p className="text-sm text-destructive mt-2 font-medium">⚠️ No classes available. Please create a class first before importing students.</p>
              )}
            </div>
          )}

          <Tabs defaultValue="file" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto">
              <TabsTrigger value="file" className="gap-2 px-3 py-2 text-xs sm:text-sm">
                <FileSpreadsheet className="h-4 w-4 shrink-0" />
                <span>CSV File</span>
              </TabsTrigger>
              <TabsTrigger value="text" className="gap-2 px-3 py-2 text-xs sm:text-sm">
                <Users className="h-4 w-4 shrink-0" />
                <span>Text List</span>
              </TabsTrigger>
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
              <div>
                <CardTitle className="text-card-foreground">Preview ({importData.length} students)</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Review the list below, then click "Import All" to add students</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearData}>Clear</Button>
                <Button 
                  onClick={handleImport} 
                  disabled={isImporting || (!initialClassId && !selectedClassId)} 
                  className="gap-2 bg-primary hover:bg-primary/90"
                  title={!initialClassId && !selectedClassId ? "Please select a class first" : ""}
                >
                  {isImporting ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Importing...</> : <><Upload className="h-4 w-4" />Import All</>}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {invalidCount > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  ⚠️ {invalidCount} entries have validation errors and will be skipped. {validCount} valid entries will be imported.
                </p>
              </div>
            )}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {importData.map((student, index) => (
                <div key={index} className={cn(
                  "flex items-center justify-between rounded-lg bg-background p-3",
                  student.status === "invalid" && "bg-amber-500/5 border border-amber-500/20"
                )}>
                  <div className="flex items-center gap-3">
                    {getStatusIcon(student.status)}
                    <div>
                      <p className="font-medium text-foreground">{student.name}</p>
                      {student.email && <p className="text-sm text-muted-foreground">{student.email}</p>}
                      {student.error && <p className="text-xs text-amber-600 dark:text-amber-400">{student.error}</p>}
                    </div>
                  </div>
                  <Badge variant={student.status === "success" ? "default" : student.status === "error" || student.status === "invalid" ? "destructive" : "secondary"}>
                    {student.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
