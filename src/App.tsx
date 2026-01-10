import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";

// Lazy load page components for code-splitting
const InstitutesPage = lazy(() => import("./pages/InstitutesPage"));
const InstitutePage = lazy(() => import("./pages/InstitutePage"));
const ClassPage = lazy(() => import("./pages/ClassPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const FilesPage = lazy(() => import("./pages/FilesPage"));
const RemindersPage = lazy(() => import("./pages/RemindersPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

// Apply persisted settings on app load
function applyPersistedSettings() {
  const darkMode = localStorage.getItem("darkMode") === "true";
  const compactView = localStorage.getItem("compactView") === "true";
  
  if (darkMode) {
    document.documentElement.classList.add("dark");
  }
  if (compactView) {
    document.documentElement.classList.add("compact");
  }
}

// Apply immediately on script load
applyPersistedSettings();

const App = () => {
  // Re-apply on mount to ensure settings are applied after hydration
  useEffect(() => {
    applyPersistedSettings();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<InstitutesPage />} />
              <Route path="/institute/:instituteId" element={<InstitutePage />} />
              <Route path="/institute/:instituteId/class/:classId" element={<ClassPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/files" element={<FilesPage />} />
              <Route path="/reminders" element={<RemindersPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
