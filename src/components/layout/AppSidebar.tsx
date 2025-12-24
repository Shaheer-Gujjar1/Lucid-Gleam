import { useEffect, useState } from "react";
import { Building2, BookOpen, ChevronRight, Home, Settings, FolderOpen } from "lucide-react";
import { NavLink, useLocation, useParams } from "react-router-dom";
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
    <Sidebar collapsible="icon" variant="floating" className="border border-border/30 bg-sidebar/70 backdrop-blur-xl rounded-2xl shadow-xl">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/"}
                  tooltip="Home"
                  className={cn(
                    "rounded-lg transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-primary/15 data-[active=true]:text-primary data-[active=true]:font-medium",
                    collapsed ? "mx-auto justify-center" : "mx-2"
                  )}
                >
                  <NavLink to="/">
                    <Home className="h-4 w-4 shrink-0" />
                    <span>Home</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/files"}
                  tooltip="Files"
                  className={cn(
                    "rounded-lg transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-primary/15 data-[active=true]:text-primary data-[active=true]:font-medium",
                    collapsed ? "mx-auto justify-center" : "mx-2"
                  )}
                >
                  <NavLink to="/files">
                    <FolderOpen className="h-4 w-4 shrink-0" />
                    <span>Files</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/settings"}
                  tooltip="Settings"
                  className={cn(
                    "rounded-lg transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-primary/15 data-[active=true]:text-primary data-[active=true]:font-medium",
                    collapsed ? "mx-auto justify-center" : "mx-2"
                  )}
                >
                  <NavLink to="/settings">
                    <Settings className="h-4 w-4 shrink-0" />
                    <span>Settings</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
            Institutes
          </SidebarGroupLabel>
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
                      className={cn(
                        "rounded-lg transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-primary/15 data-[active=true]:text-primary data-[active=true]:font-medium",
                        collapsed ? "mx-auto justify-center" : "mx-2"
                      )}
                    >
                      <NavLink to={`/institute/${institute.id}`}>
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span className="truncate">{institute.name}</span>
                      </NavLink>
                    </SidebarMenuButton>
                    {classesMap[institute.id]?.length > 0 && (
                      <CollapsibleTrigger asChild>
                        <button
                          className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-accent transition-colors",
                            collapsed && "hidden"
                          )}
                        >
                          <ChevronRight
                            className={cn(
                              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                              openInstitutes.includes(institute.id) && "rotate-90"
                            )}
                          />
                        </button>
                      </CollapsibleTrigger>
                    )}
                  </SidebarMenuItem>
                  <CollapsibleContent className="animate-accordion-down">
                    <SidebarMenuSub className="ml-4 border-l-2 border-border/50 pl-2">
                      {classesMap[institute.id]?.map((cls) => (
                        <SidebarMenuSubItem key={cls.id}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isActiveClass(cls.id)}
                            className="rounded-md transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-primary/15 data-[active=true]:text-primary data-[active=true]:font-medium"
                          >
                            <NavLink to={`/institute/${institute.id}/class/${cls.id}`}>
                              <BookOpen className="h-3.5 w-3.5" />
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
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <Building2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No institutes yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Add your first institute to get started</p>
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
