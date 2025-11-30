import "./global.css";
import "./lib/resize-observer-fix";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import PrincipalDashboard from "./pages/PrincipalDashboard";
import StudentQRScan from "./pages/StudentQRScan";
import APITest from "./pages/APITest";
import EmailTest from "./pages/EmailTest";
import NotFound from "./pages/NotFound";
import EmailScanLanding from "./pages/EmailScanLanding";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="attendance-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/student-dashboard"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher-dashboard"
              element={
                <ProtectedRoute allowedRole="teacher">
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/principal-dashboard"
              element={
                <ProtectedRoute allowedRole="principal">
                  <PrincipalDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/student-qr-scan" element={<StudentQRScan />} />
            <Route path="/scan/from-email" element={<EmailScanLanding />} />
            <Route path="/api-test" element={<APITest />} />
            <Route path="/email-test" element={<EmailTest />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

// Prevent multiple createRoot calls during development
const rootElement = document.getElementById("root")!;
let reactRoot: any = null;

function renderApp() {
  if (!reactRoot) {
    reactRoot = createRoot(rootElement);
  }
  reactRoot.render(<App />);
}

renderApp();
