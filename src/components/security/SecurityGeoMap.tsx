import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Globe, RefreshCw, AlertCircle, Info } from "lucide-react";
import { useSecurityEvents } from "@/hooks/useSecurityEvents";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface LocationData {
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  count: number;
  events: Array<{
    event_type: string;
    severity: string;
    created_at: string;
    ip_address: string;
  }>;
}

export const SecurityGeoMap = () => {
  const { data: events, isLoading, refetch } = useSecurityEvents();
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  // Group events by location
  const locationData = useMemo(() => {
    if (!events) return [];

    const locationMap = new Map<string, LocationData>();

    events.forEach((event) => {
      if (event.latitude && event.longitude) {
        const key = `${event.latitude.toFixed(2)},${event.longitude.toFixed(2)}`;
        
        if (!locationMap.has(key)) {
          locationMap.set(key, {
            country: event.country || "غير معروف",
            city: event.city || "غير معروف",
            latitude: event.latitude,
            longitude: event.longitude,
            count: 0,
            events: [],
          });
        }

        const loc = locationMap.get(key)!;
        loc.count++;
        loc.events.push({
          event_type: event.event_type,
          severity: event.severity,
          created_at: event.created_at,
          ip_address: event.ip_address || "",
        });
      }
    });

    return Array.from(locationMap.values()).sort((a, b) => b.count - a.count);
  }, [events]);

  // Get country statistics
  const countryStats = useMemo(() => {
    const stats = new Map<string, number>();
    events?.forEach((event) => {
      if (event.country) {
        stats.set(event.country, (stats.get(event.country) || 0) + 1);
      }
    });
    return Array.from(stats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [events]);

  // Get severity statistics by location
  const severityByLocation = useMemo(() => {
    const critical = locationData.filter((loc) =>
      loc.events.some((e) => e.severity === "critical")
    ).length;
    const warning = locationData.filter((loc) =>
      loc.events.some((e) => e.severity === "warning")
    ).length;
    return { critical, warning, total: locationData.length };
  }, [locationData]);

  const getEventIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getMarkerColor = (events: LocationData["events"]) => {
    if (events.some((e) => e.severity === "critical")) return "bg-red-500";
    if (events.some((e) => e.severity === "warning")) return "bg-yellow-500";
    return "bg-blue-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">خريطة الأحداث الأمنية</h2>
            <p className="text-sm text-muted-foreground">
              عرض جغرافي لمحاولات الدخول والأحداث الأمنية
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 ml-2" />
          تحديث
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{locationData.length}</div>
            <p className="text-xs text-muted-foreground">مواقع فريدة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{countryStats.length}</div>
            <p className="text-xs text-muted-foreground">دول مختلفة</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">
              {severityByLocation.critical}
            </div>
            <p className="text-xs text-muted-foreground">مواقع بأحداث حرجة</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">
              {severityByLocation.warning}
            </div>
            <p className="text-xs text-muted-foreground">مواقع بتحذيرات</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Visualization */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              خريطة المواقع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-muted rounded-lg aspect-video overflow-hidden">
              {/* Simple World Map SVG Background */}
              <svg
                viewBox="0 0 1000 500"
                className="w-full h-full opacity-20"
                preserveAspectRatio="xMidYMid slice"
              >
                <rect fill="currentColor" width="1000" height="500" />
              </svg>

              {/* Location Markers */}
              <div className="absolute inset-0">
                {locationData.map((location, index) => {
                  // Convert lat/long to percentage position (simple projection)
                  const x = ((location.longitude + 180) / 360) * 100;
                  const y = ((90 - location.latitude) / 180) * 100;

                  return (
                    <button
                      key={index}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-150 z-10 ${
                        selectedLocation === location ? "scale-150 z-20" : ""
                      }`}
                      style={{ left: `${x}%`, top: `${y}%` }}
                      onClick={() => setSelectedLocation(location)}
                    >
                      <div
                        className={`w-4 h-4 rounded-full ${getMarkerColor(
                          location.events
                        )} shadow-lg animate-pulse`}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-background px-1 text-xs rounded shadow whitespace-nowrap">
                          {location.count}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="absolute bottom-4 right-4 bg-background/90 p-3 rounded-lg shadow-lg">
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>أحداث حرجة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span>تحذيرات</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>معلومات</span>
                  </div>
                </div>
              </div>

              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              )}
            </div>

            {/* Selected Location Details */}
            {selectedLocation && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-lg">
                      {selectedLocation.city}, {selectedLocation.country}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedLocation.count} حدث من هذا الموقع
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLocation(null)}
                  >
                    ✕
                  </Button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedLocation.events.slice(0, 5).map((event, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm bg-background p-2 rounded"
                    >
                      <div className="flex items-center gap-2">
                        {getEventIcon(event.severity)}
                        <span>{event.event_type}</span>
                      </div>
                      <span className="text-muted-foreground" dir="ltr">
                        {event.ip_address}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Countries List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              الدول الأكثر نشاطاً
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {countryStats.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    لا توجد بيانات جغرافية متوفرة
                  </p>
                ) : (
                  countryStats.map(([country, count], index) => (
                    <div
                      key={country}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <span className="font-medium">{country}</span>
                      </div>
                      <Badge variant="secondary">{count} حدث</Badge>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Recent Locations */}
      <Card>
        <CardHeader>
          <CardTitle>آخر المواقع المرصودة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locationData.slice(0, 6).map((location, index) => (
              <div
                key={index}
                className="p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                onClick={() => setSelectedLocation(location)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-3 h-3 rounded-full ${getMarkerColor(
                      location.events
                    )}`}
                  />
                  <span className="font-medium">
                    {location.city}, {location.country}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {location.count} حدث •{" "}
                  {format(
                    new Date(location.events[0]?.created_at || new Date()),
                    "dd MMM yyyy",
                    { locale: ar }
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
