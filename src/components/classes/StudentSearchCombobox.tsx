import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { Student } from "@/lib/db";

interface StudentSearchComboboxProps {
  students: Student[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function StudentSearchCombobox({
  students,
  value,
  onValueChange,
  placeholder = "Select a student",
  className,
}: StudentSearchComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedStudent = students.find((s) => s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          <span className="truncate">
            {selectedStudent ? selectedStudent.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 z-50" align="start">
        <Command>
          <CommandInput placeholder="Search students..." />
          <CommandList>
            <CommandEmpty>No student found.</CommandEmpty>
            <CommandGroup>
              {students.map((student) => (
                <CommandItem
                  key={student.id}
                  value={student.name}
                  onSelect={() => {
                    onValueChange(student.id);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2 w-full">
                    {student.photo ? (
                      <img
                        src={student.photo}
                        alt={student.name}
                        className="h-6 w-6 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground shrink-0">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="truncate flex-1">{student.name}</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4 shrink-0",
                      value === student.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
