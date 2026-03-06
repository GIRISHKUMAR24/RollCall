import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoutButton from "@/components/LogoutButton";
import { authHelpers } from "@/lib/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  QrCode,
  GraduationCap,
  LogOut,
  BookOpen,
  Calendar,
  MapPin,
  BarChart3,
} from "lucide-react";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const user = authHelpers.getCurrentUser();

    if (!user) {
      navigate("/");
      return;
    }

    setUserEmail(user.email);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-800">
      {/* Header */}
      <header className="bg-white border-b shadow-sm hover:shadow-md transition-all duration-300 dark:bg-gray-900 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Student Portal
                </h1>
                <p className="text-sm text-gray-600">{userEmail}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <LogoutButton className="hover:scale-105 hover:shadow-lg transition-all duration-300 dark:hover:bg-gray-700 dark:border-gray-600" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* QR Scanner */}
            <Card className="border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <QrCode className="w-5 h-5 text-blue-600" />
                  <span>Scan QR Code</span>
                </CardTitle>
                <CardDescription>
                  Scan the QR code shown by your teacher to mark attendance
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <div className="mx-auto w-32 h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4">
                  <QrCode className="w-12 h-12 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-4">
                  Camera scanner will appear here
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" />
                  <span>Ensure you're within classroom location</span>
                </div>
                <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
                  <QrCode className="w-4 h-4 mr-2" />
                  Open QR Scanner
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Today's Schedule */}
            <Card className="border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <span>Today's Classes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    time: "9:00 AM",
                    subject: "Mathematics",
                    status: "Present",
                  },
                  { time: "10:30 AM", subject: "Physics", status: "Present" },
                  {
                    time: "12:00 PM",
                    subject: "Chemistry",
                    status: "Upcoming",
                  },
                  { time: "2:00 PM", subject: "English", status: "Upcoming" },
                ].map((class_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors duration-200"
                  >
                    <div>
                      <div className="font-medium text-sm">
                        {class_.subject}
                      </div>
                      <div className="text-xs text-gray-500">{class_.time}</div>
                    </div>
                    <Badge
                      variant={
                        class_.status === "Present" ? "default" : "secondary"
                      }
                      className={
                        class_.status === "Present"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }
                    >
                      {class_.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="w-4 h-4 mr-2" />
                  View Timetable
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Attendance Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
