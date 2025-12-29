import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import InstitutesPage from "./pages/InstitutesPage";
import InstitutePage from "./pages/InstitutePage";
import ClassPage from "./pages/ClassPage";
import SettingsPage from "./pages/SettingsPage";
import FilesPage from "./pages/FilesPage";
import RemindersPage from "./pages/RemindersPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
