import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Wifi, WifiOff, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GeofenceStatusProps {
  isWithinZone?: boolean;
  isLoading?: boolean;
  className?: string;
  showDetails?: boolean;
}

export function GeofenceStatus({ 
  isWithinZone = false, 
  isLoading = false, 
  className,
  showDetails = true 
}: GeofenceStatusProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate getting user location
    const getLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            setLocationError(null);
          },
          (error) => {
            setLocationError(error.message);
          }
        );
      } else {
        setLocationError("Geolocation is not supported by this browser.");
      }
    };

    getLocation();
  }, []);

  if (isLoading) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        <span className="text-sm text-gray-600">Checking location...</span>
      </div>
    );
  }

  const statusIcon = locationError ? (
    <WifiOff className="w-4 h-4 text-red-600" />
  ) : isWithinZone ? (
    <CheckCircle className="w-4 h-4 text-green-600" />
  ) : (
    <XCircle className="w-4 h-4 text-red-600" />
  );

  const statusText = locationError ? 
    "Location disabled" : 
    isWithinZone ? "Within classroom zone" : "Outside classroom zone";

  const statusColor = locationError ? "destructive" : 
    isWithinZone ? "default" : "destructive";

  const badgeClassName = locationError ? "bg-red-100 text-red-700" : 
    isWithinZone ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center space-x-2">
        <MapPin className="w-4 h-4 text-gray-500" />
        <Badge variant={statusColor} className={badgeClassName}>
          {statusIcon}
          <span className="ml-1">{statusText}</span>
        </Badge>
      </div>
      
      {showDetails && (
        <Card className="border border-gray-200">
          <CardContent className="p-3">
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>GPS Status:</span>
                <span className={cn(
                  "font-medium",
                  location ? "text-green-600" : "text-red-600"
                )}>
                  {location ? "Active" : "Inactive"}
                </span>
              </div>
              
              {location && (
                <>
                  <div className="flex justify-between">
                    <span>Latitude:</span>
                    <span className="font-mono">{location.lat.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Longitude:</span>
                    <span className="font-mono">{location.lng.toFixed(6)}</span>
                  </div>
                </>
              )}
              
              <div className="flex justify-between">
                <span>Zone Radius:</span>
                <span>12 meters</span>
              </div>
              
              {locationError && (
                <div className="text-red-600 text-xs mt-1">
                  Error: {locationError}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface GeofenceMapProps {
  centerLat: number;
  centerLng: number;
  radius: number;
  userLocation?: { lat: number; lng: number };
  className?: string;
}

export function GeofenceMap({ 
  centerLat, 
  centerLng, 
  radius, 
  userLocation,
  className 
}: GeofenceMapProps) {
  // In a real app, you'd integrate with Google Maps or Mapbox
  // For now, we'll show a simple visual representation
  
  const isUserInZone = userLocation && 
    Math.sqrt(
      Math.pow(userLocation.lat - centerLat, 2) + 
      Math.pow(userLocation.lng - centerLng, 2)
    ) * 111000 <= radius; // Rough conversion to meters

  return (
    <div className={cn("relative", className)}>
      <div className="w-full h-48 bg-gray-100 rounded-lg border-2 border-gray-200 relative overflow-hidden">
        {/* Classroom center */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-blue-400 border-dashed rounded-full opacity-50"></div>
        </div>
        
        {/* User location */}
        {userLocation && (
          <div className={cn(
            "absolute w-3 h-3 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2",
            isUserInZone ? "bg-green-500" : "bg-red-500"
          )}
          style={{
            top: `${50 + (userLocation.lat - centerLat) * 1000}%`,
            left: `${50 + (userLocation.lng - centerLng) * 1000}%`
          }}>
          </div>
        )}
        
        {/* Labels */}
        <div className="absolute bottom-2 left-2 text-xs text-gray-600 bg-white px-2 py-1 rounded shadow">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span>Classroom</span>
          </div>
        </div>
        
        {userLocation && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-600 bg-white px-2 py-1 rounded shadow">
            <div className="flex items-center space-x-1">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isUserInZone ? "bg-green-500" : "bg-red-500"
              )}></div>
              <span>You</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-2 text-center text-xs text-gray-500">
        Mock geofence visualization - {radius}m radius
      </div>
    </div>
  );
}
