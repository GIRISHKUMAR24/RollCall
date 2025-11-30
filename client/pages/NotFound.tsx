import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft, GraduationCap } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900 px-4 relative">
      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex justify-center">
            <img
              src="/rollcall-logo.png"
              alt="RollCall Logo"
              className="w-16 h-16 object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">RollCall</h1>
        </div>

        <Card className="border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-black/40 dark:shadow-2xl dark:shadow-purple-500/20">
          <CardHeader className="text-center">
            <div className="text-6xl font-bold text-gray-300 mb-4">404</div>
            <CardTitle className="text-2xl font-semibold dark:text-white">Page Not Found</CardTitle>
            <CardDescription className="dark:text-gray-300">
              The page you're looking for doesn't exist or has been moved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link to="/">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-cyan-500 dark:to-blue-600 dark:hover:from-cyan-600 dark:hover:to-blue-700 shadow-lg dark:shadow-cyan-500/25">
                <Home className="w-4 h-4 mr-2" />
                Go to Login
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full dark:bg-black/20 dark:border-gray-600 dark:text-white dark:hover:bg-black/30"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need help? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
