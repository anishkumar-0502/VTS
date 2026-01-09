import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import WorldMapCard from "../../components/ecommerce/WorldMap";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import PageMeta from "../../components/common/PageMeta";
import { dashboardAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import DashboardShimmer from "../../components/common/DashboardShimmer";


interface FleetOverviewData {
  totalVehicles: number;
  activeVehicles: number;
  idleVehicles: number;
  maintenanceVehicles: number;
  offlineVehicles: number;
  totalOperators: number;
  totalTrackers: number;
  activeTrackers: number;
  averageSpeed: number;
  alertsLast24h: number;
  utilizationRate: number;
  totalEndUsers?: number;
}

interface AlertTypeCount {
  type: string | null;
  label: string;
  count: number;
}

interface AlertSummaryData {
  totalAlerts24h: number;
  alertsByType: AlertTypeCount[];
  topAlertType: string | null;
}

interface OperatorStat {
  operatorId: string;
  operatorName: string;
  totalVehicles: number;
  activeVehicles: number;
  idleVehicles: number;
  maintenanceVehicles: number;
  offlineVehicles: number;
  averageSpeed: number;
  utilizationRate: number;
  issueVehicles: number;
}

interface OperatorPerformanceData {
  topOperators: OperatorStat[];
}

interface RouteSummaryData {
  totalRoutes: number;
  activeRoutes: number;
  routesWithIssues: number;
  averageRouteSpeed: number;
  onScheduleRate: number;
}

interface RouteDetailData {
  routeName: string;
  averageSpeed: number;
  activeVehicles: number;
  issueVehicles: number;
  stopCount: number;
}

interface RouteHealthData {
  summary: RouteSummaryData;
  slowRoutes: RouteDetailData[];
}

interface MaintenanceSummaryData {
  overdue: number;
  dueSoon: number;
  dueLater: number;
}

interface MaintenanceItemData {
  vehicleId: string;
  vehicleNumber: string;
  operatorId: string | null;
  operatorName: string | null;
  trackerId: string | null;
  status: string;
  dueDate: string | null;
  daysUntilDue: number | null;
}

interface MaintenanceData {
  summary: MaintenanceSummaryData;
  upcoming: MaintenanceItemData[];
}

interface LiveVehicleData {
  vehicleId: string | null;
  vehicleNumber: string | null;
  operatorId: string | null;
  operatorName: string | null;
  operatorCountry: string | null;
  trackerId: string | null;
  latitude: number | null;
  longitude: number | null;
  speed: number;
  status: string;
  lastUpdate: string | null;
}

interface CustomerDemographicCountry {
  country: string;
  customers: number;
  percentage: number;
}

interface CustomerDemographicsData {
  totalCustomers: number;
  countries: CustomerDemographicCountry[];
}

interface DashboardAnalyticsData {
  fleetOverview: FleetOverviewData;
  alertSummary: AlertSummaryData;
  operatorPerformance: OperatorPerformanceData;
  routeHealth: RouteHealthData;
  maintenance: MaintenanceData;
  liveVehicles: LiveVehicleData[];
  customerDemographics?: CustomerDemographicsData;
}

type OperatorTrackingEntry = {
  device_id?: string | null;
  vehicle_id?: string | null;
  vehicle_number?: string | null;
  operator_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  speed?: number | null;
  timestamp?: string | Date | null;
  status?: string | null;
  [key: string]: unknown;
};

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const role = user?.role === "operator" ? "operator" : "superadmin";
  const operatorDisplayName = user?.name || "Your Fleet";

  const createEmptyAnalytics = (): DashboardAnalyticsData => ({
    fleetOverview: {
      totalVehicles: 0,
      activeVehicles: 0,
      idleVehicles: 0,
      maintenanceVehicles: 0,
      offlineVehicles: 0,
      totalOperators: 0,
      totalTrackers: 0,
      activeTrackers: 0,
      averageSpeed: 0,
      alertsLast24h: 0,
      utilizationRate: 0,
      totalEndUsers: 0,
    },
    alertSummary: {
      totalAlerts24h: 0,
      alertsByType: [],
      topAlertType: null,
    },
    operatorPerformance: {
      topOperators: [],
    },
    routeHealth: {
      summary: {
        totalRoutes: 0,
        activeRoutes: 0,
        routesWithIssues: 0,
        averageRouteSpeed: 0,
        onScheduleRate: 0,
      },
      slowRoutes: [],
    },
    maintenance: {
      summary: {
        overdue: 0,
        dueSoon: 0,
        dueLater: 0,
      },
      upcoming: [],
    },
    liveVehicles: [],
    customerDemographics: {
      totalCustomers: 0,
      countries: [],
    },
  });

  const adaptAnalyticsPayload = (payload: any, currentRole: string): DashboardAnalyticsData => {
    if (payload?.fleetOverview) {
      const typed = payload as DashboardAnalyticsData;
      return {
        ...typed,
        customerDemographics:
          typed.customerDemographics ?? {
            totalCustomers: 0,
            countries: [],
          },
      };
    }

    const base = createEmptyAnalytics();

    if (currentRole !== "operator") {
      return base;
    }

    const totalVehicles = payload?.totalVehicles ?? 0;
    const activeVehicles = payload?.activeVehicles ?? 0;
    const maintenanceVehicles = payload?.maintenanceVehicles ?? 0;
    const computedIdle =
      payload?.idleVehicles ?? Math.max(totalVehicles - activeVehicles - maintenanceVehicles, 0);
    const computedOffline =
      payload?.offlineVehicles ?? Math.max(totalVehicles - activeVehicles - maintenanceVehicles, 0);
    const totalTrackers = payload?.totalDevices ?? 0;
    const activeTrackers = payload?.activeDevices ?? 0;
    const totalEndUsers = payload?.totalEndUsers ?? 0;
    const utilizationRate = totalVehicles
      ? Number(((activeVehicles / totalVehicles) * 100).toFixed(1))
      : 0;

    base.fleetOverview = {
      totalVehicles,
      activeVehicles,
      idleVehicles: computedIdle,
      maintenanceVehicles,
      offlineVehicles: computedOffline,
      totalOperators: 1,
      totalTrackers,
      activeTrackers,
      averageSpeed: 0,
      alertsLast24h: 0,
      utilizationRate,
      totalEndUsers,
    };

    base.operatorPerformance = {
      topOperators: totalVehicles
        ? [
            {
              operatorId: payload?.operatorIds?.[0] || "operator",
              operatorName: operatorDisplayName,
              totalVehicles,
              activeVehicles,
              idleVehicles: computedIdle,
              maintenanceVehicles,
              offlineVehicles: computedOffline,
              averageSpeed: 0,
              utilizationRate,
              issueVehicles: maintenanceVehicles + computedOffline,
            },
          ]
        : [],
    };

    const trackingEntries = Array.isArray(payload?.recentTracking)
      ? (payload.recentTracking as OperatorTrackingEntry[])
      : [];
    const seenTrackerIds = new Set<string>();
    const seenVehicleIds = new Set<string>();
    const uniqueTracking: OperatorTrackingEntry[] = [];

    trackingEntries.forEach((entry) => {
      if (!entry) {
        return;
      }
      const trackerKey =
        typeof entry?.device_id === "string" && entry.device_id.trim().length
          ? entry.device_id.trim()
          : null;
      const vehicleKey =
        typeof entry?.vehicle_id === "string" && entry.vehicle_id.trim().length
          ? entry.vehicle_id.trim()
          : null;

      if (trackerKey) {
        if (seenTrackerIds.has(trackerKey)) {
          return;
        }
        seenTrackerIds.add(trackerKey);
      } else if (vehicleKey) {
        if (seenVehicleIds.has(vehicleKey)) {
          return;
        }
        seenVehicleIds.add(vehicleKey);
      }
      uniqueTracking.push(entry);
    });

    base.liveVehicles = uniqueTracking.map((entry) => {
      const timestamp = entry?.timestamp ? new Date(entry.timestamp) : null;
      const lastUpdate =
        timestamp && !Number.isNaN(timestamp.getTime()) ? timestamp.toISOString() : null;
      const speedValue = typeof entry?.speed === "number" ? entry.speed : 0;
      const formattedSpeed = Number(speedValue.toFixed(1));
      const rawStatusSource =
        typeof entry?.current_status === "string" && entry.current_status.trim().length
          ? entry.current_status.trim()
          : typeof entry?.device_status === "string" && entry.device_status.trim().length
          ? entry.device_status.trim()
          : typeof entry?.status === "string"
          ? entry.status.trim()
          : "";
      const status =
        rawStatusSource.length
          ? rawStatusSource.toLowerCase()
          : lastUpdate
          ? speedValue > 1
            ? "active"
            : "idle"
          : "offline";

      return {
        vehicleId: entry?.vehicle_id ?? null,
        vehicleNumber: entry?.vehicle_number ?? null,
        operatorId: entry?.operator_id ?? payload?.operatorIds?.[0] ?? null,
        operatorName: operatorDisplayName,
        operatorCountry: null,
        trackerId: entry?.device_id ?? null,
        latitude: typeof entry?.latitude === "number" ? entry.latitude : null,
        longitude: typeof entry?.longitude === "number" ? entry.longitude : null,
        speed: formattedSpeed,
        status,
        lastUpdate,
      };
    });

    const derivedTrackerIds = new Set(
      base.liveVehicles
        .map((vehicle) =>
          typeof vehicle.trackerId === "string" && vehicle.trackerId.trim().length
            ? vehicle.trackerId.trim()
            : null
        )
        .filter((id): id is string => Boolean(id))
    );
    const derivedActiveTrackers = base.liveVehicles.filter(
      (vehicle) => typeof vehicle.status === "string" && vehicle.status !== "offline"
    ).length;
    base.fleetOverview.totalTrackers = Math.max(
      base.fleetOverview.totalTrackers,
      derivedTrackerIds.size
    );
    base.fleetOverview.activeTrackers = Math.max(
      base.fleetOverview.activeTrackers,
      derivedActiveTrackers
    );

    base.customerDemographics = {
      totalCustomers: totalEndUsers,
      countries: [],
    };

    return base;
  };

  const [analytics, setAnalytics] = useState<DashboardAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let isMounted = true;

    const fetchAnalytics = async (showSpinner: boolean) => {
      if (showSpinner) {
        setLoading(true);
        setError(null);
      }
      try {
        const response: any = await dashboardAPI.getAnalytics(role);
        if (!isMounted) {
          return;
        }
        if (response?.error === false && response?.data) {
          setAnalytics(adaptAnalyticsPayload(response.data, role));
          setError(null);
        } else if (response?.success && response?.data) {
          setAnalytics(adaptAnalyticsPayload(response.data, role));
          setError(null);
        } else {
          if (showSpinner) {
            setAnalytics(createEmptyAnalytics());
          }
          setError(response?.message || "Failed to load dashboard analytics");
        }
      } catch (fetchError) {
        console.error("Dashboard analytics fetch error", fetchError);
        if (!isMounted) {
          return;
        }
        if (showSpinner) {
          setAnalytics(createEmptyAnalytics());
        }
        setError("Failed to load dashboard analytics");
      } finally {
        if (showSpinner && isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAnalytics(true);
    const intervalId = window.setInterval(() => {
      fetchAnalytics(false);
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [authLoading, role]);

  const fleetOverview = analytics?.fleetOverview;
  const alertSummary = analytics?.alertSummary;
  const routeHealth = analytics?.routeHealth;
  const operatorStats = analytics?.operatorPerformance?.topOperators ?? [];
  const liveVehicles = useMemo(
    () => analytics?.liveVehicles ?? [],
    [analytics?.liveVehicles]
  );
  const customerDemographics = analytics?.customerDemographics;
  const demographicCountries = customerDemographics?.countries ?? [];
  const totalCustomers = customerDemographics?.totalCustomers ?? 0;
  const demographicLabel = role === "operator" ? "End Users" : "Customers";
  const liveVehicleMarkers = useMemo(
    () =>
      liveVehicles
        .filter(
          (vehicle) =>
            typeof vehicle.latitude === "number" && typeof vehicle.longitude === "number"
        )
        .map((vehicle) => ({
          lat: vehicle.latitude as number,
          lng: vehicle.longitude as number,
          name: vehicle.vehicleNumber
            ? `${vehicle.vehicleNumber}${vehicle.trackerId ? ` • ${vehicle.trackerId}` : ""}`
            : vehicle.trackerId || "Unassigned Device",
        })),
    [liveVehicles]
  );

  const handleVehicleNavigate = (vehicle: LiveVehicleData) => {
    if (!vehicle.trackerId && !vehicle.vehicleId) {
      navigate("/live-tracking");
      return;
    }
    const params = new URLSearchParams();
    if (vehicle.trackerId) {
      params.set("deviceId", vehicle.trackerId);
    }
    if (vehicle.vehicleId) {
      params.set("vehicleId", vehicle.vehicleId);
    }
    const query = params.toString();
    navigate(query ? `/live-tracking?${query}` : "/live-tracking");
  };


if (loading) {
  return (
    <>
      <PageMeta
        title="VTS Dashboard"
        description="Track vehicles in real time, view activity status, and manage fleet performance."
      />
      <DashboardShimmer />
    </>
  );
}

  
  return (
    <>
     <PageMeta
  title="VTS Dashboard"
  description="Track vehicles in real time, view activity status, and manage fleet performance."
/>

      <div>
        {error && !loading && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12">
            <EcommerceMetrics metrics={fleetOverview} loading={loading} role={role} />
          </div>

          <div className="col-span-12 xl:col-span-8 space-y-6">
            <WorldMapCard
              markers={liveVehicleMarkers}
              countries={demographicCountries}
              loading={loading}
              totalCustomers={totalCustomers}
              entityLabel={demographicLabel}
            />
          </div>

          <div className="col-span-12 xl:col-span-4 space-y-6">
            <MonthlyTarget routeHealth={routeHealth} loading={loading} />
          </div>

          <div className="col-span-12">
            <MonthlySalesChart summary={alertSummary} loading={loading} />
          </div>

          <div className="col-span-12">
            <StatisticsChart operators={operatorStats} loading={loading} />
          </div>

          <div className="col-span-12">
            <RecentOrders
              liveVehicles={liveVehicles}
              loading={loading}
              onVehicleNavigate={handleVehicleNavigate}
            />
          </div>
        </div>
      </div>
    </>
  );
}
