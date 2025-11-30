import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Timer, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceTimerProps {
  duration: number; // in seconds
  onComplete?: () => void;
  onTick?: (remaining: number) => void;
  isActive: boolean;
  className?: string;
}

export function AttendanceTimer({ 
  duration, 
  onComplete, 
  onTick, 
  isActive,
  className 
}: AttendanceTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (isActive && !isFinished) {
      setTimeLeft(duration);
    }
  }, [isActive, duration, isFinished]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          onTick?.(newTime);
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0 && !isFinished) {
      setIsFinished(true);
      onComplete?.();
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, onComplete, onTick, isFinished]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressValue = ((duration - timeLeft) / duration) * 100;
  const isWarning = timeLeft <= 10 && timeLeft > 0;
  const isDanger = timeLeft <= 5 && timeLeft > 0;

  if (!isActive && !isFinished) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isFinished ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <Timer className={cn(
              "w-5 h-5",
              isDanger ? "text-red-600" : isWarning ? "text-yellow-600" : "text-blue-600"
            )} />
          )}
          <span className="font-medium text-gray-900">
            {isFinished ? "Attendance Closed" : "Attendance Window"}
          </span>
        </div>
        <Badge 
          variant={isFinished ? "default" : isDanger ? "destructive" : isWarning ? "secondary" : "default"}
          className={cn(
            isFinished ? "bg-green-100 text-green-700" :
            isDanger ? "bg-red-100 text-red-700" :
            isWarning ? "bg-yellow-100 text-yellow-700" :
            "bg-blue-100 text-blue-700"
          )}
        >
          {isFinished ? "Completed" : formatTime(timeLeft)}
        </Badge>
      </div>
      
      {!isFinished && (
        <Progress 
          value={progressValue} 
          className={cn(
            "h-2",
            isDanger ? "bg-red-100" : isWarning ? "bg-yellow-100" : "bg-blue-100"
          )}
        />
      )}
      
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-1">
          <Clock className="w-4 h-4" />
          <span>
            {isFinished ? "Session ended" : `${Math.floor(progressValue)}% elapsed`}
          </span>
        </div>
        {!isFinished && (
          <span className={cn(
            "font-medium",
            isDanger ? "text-red-600" : isWarning ? "text-yellow-600" : "text-gray-600"
          )}>
            {timeLeft <= 10 ? "Hurry up!" : "Accepting attendance"}
          </span>
        )}
      </div>
    </div>
  );
}

interface CountdownProps {
  targetDate: Date;
  onComplete?: () => void;
  className?: string;
}

export function Countdown({ targetDate, onComplete, className }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      } else if (!isComplete) {
        setIsComplete(true);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete, isComplete]);

  if (isComplete) {
    return (
      <div className={cn("text-center", className)}>
        <Badge className="bg-green-100 text-green-700">
          <CheckCircle className="w-4 h-4 mr-1" />
          Time's up!
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-4 gap-2 text-center", className)}>
      {Object.entries(timeLeft).map(([unit, value]) => (
        <div key={unit} className="bg-gray-50 rounded-lg p-2">
          <div className="text-lg font-bold text-gray-900">{value}</div>
          <div className="text-xs text-gray-500 capitalize">{unit}</div>
        </div>
      ))}
    </div>
  );
}
