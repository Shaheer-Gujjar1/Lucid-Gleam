import { useEffect, useState } from "react";
import { Building2, BookOpen, ChevronRight, Home } from "lucide-react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getAllInstitutes, getClassesByInstitute, Institute, Class } from "@/lib/db";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { instituteId, classId } = useParams();

  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [classesMap, setClassesMap] = useState<Record<string, Class[]>>({});
  const [openInstitutes, setOpenInstitutes] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Auto-expand the institute containing the current class
    if (instituteId && !openInstitutes.includes(instituteId)) {
      setOpenInstitutes((prev) => [...prev, instituteId]);
    }
  }, [instituteId]);

  async function loadData() {
    const allInstitutes = await getAllInstitutes();
    setInstitutes(allInstitutes);

    const classMap: Record<string, Class[]> = {};
    for (const inst of allInstitutes) {
      const classes = await getClassesByInstitute(inst.id);
      classMap[inst.id] = classes;
    }
    setClassesMap(classMap);
  }

  const toggleInstitute = (id: string) => {
    setOpenInstitutes((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isActiveInstitute = (id: string) => {
    return location.pathname.includes(`/institute/${id}`);
  };

  const isActiveClass = (id: string) => {
    return location.pathname.includes(`/class/${id}`);
  };

  // Refresh data when navigating (to catch new institutes/classes)
  useEffect(() => {
    loadData();
  }, [location.pathname]);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/"}
                  tooltip="Home"
                >
                  <NavLink to="/">
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Institutes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {institutes.map((institute) => (
                <Collapsible
                  key={institute.id}
                  open={openInstitutes.includes(institute.id)}
                  onOpenChange={() => toggleInstitute(institute.id)}
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActiveInstitute(institute.id) && !classId}
                      tooltip={institute.name}
                    >
                      <NavLink to={`/institute/${institute.id}`}>
                        <Building2 className="h-4 w-4" />
                        <span className="truncate">{institute.name}</span>
                      </NavLink>
                    </SidebarMenuButton>
                    {classesMap[institute.id]?.length > 0 && (
                      <CollapsibleTrigger asChild>
                        <button
                          className={cn(
                            "absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-sidebar-accent",
                            collapsed && "hidden"
                          )}
                        >
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-transform",
                              openInstitutes.includes(institute.id) && "rotate-90"
                            )}
                          />
                        </button>
                      </CollapsibleTrigger>
                    )}
                  </SidebarMenuItem>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {classesMap[institute.id]?.map((cls) => (
                        <SidebarMenuSubItem key={cls.id}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isActiveClass(cls.id)}
                          >
                            <NavLink to={`/institute/${institute.id}/class/${cls.id}`}>
                              <BookOpen className="h-3 w-3" />
                              <span className="truncate">{cls.name}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              ))}
              {institutes.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-1">
                  No institutes yet
                </p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
