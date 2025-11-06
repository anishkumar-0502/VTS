import React, { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";

// ✅ Type definitions
interface UserByRole {
  _id: number;
  count: number;
}
interface TrackingItem {
  gps_device_id: string;
  tracker_id: string;
  vehicle_id: string | null;
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
  tracking_data_id: string;
}
interface DashboardAnalytics {
  totalOperators: number;
  totalUsers: number;
  totalDevices: number;
  totalVehicles: number;
  activeDevices: number;
  activeVehicles: number;
  usersByRole: UserByRole[];
  recentTracking: TrackingItem[];
}
interface SystemStats {
  totalOperators: number;
  totalUsers: number;
  totalDevices: number;
  totalVehicles: number;
  activeDevices: number;
  activeVehicles: number;
}

const BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.0.50:8787";

const dashboardAPI = {
  async getAnalytics() {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/superadmin/analytics/dashboard`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
    });
    return res.json();
  },
  async getSystemStats() {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/superadmin/stats/system`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
    });
    return res.json();
  },
  async getLiveTracking() {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/superadmin/tracking/live-data?limit=50`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
    });
    return res.json();
  },
};

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardAnalytics | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [liveTracking, setLiveTracking] = useState<TrackingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [analyticsRes, systemRes, trackingRes] = await Promise.all([
          dashboardAPI.getAnalytics(),
          dashboardAPI.getSystemStats(),
          dashboardAPI.getLiveTracking(),
        ]);

        if (!analyticsRes.error) setDashboardData(analyticsRes.data);
        if (!systemRes.error) setSystemStats(systemRes.data);
        if (analyticsRes.data?.recentTracking?.length) {
          setLiveTracking(analyticsRes.data.recentTracking);
        } else if (!trackingRes.error && trackingRes.data) {
          setLiveTracking(trackingRes.data);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-gray-500 dark:text-gray-400 text-lg">
        Loading Dashboard...
      </div>
    );

  return (
    <>
      <PageMeta
        title="Dashboard | Vehicle Tracking Admin"
        description="Analytics overview and system status"
      />

      <div className="p-6 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Dashboard Overview
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Summary of system stats, users, and live tracking data
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Operators" value={dashboardData?.totalOperators ?? 0} color="blue" />
          <StatCard title="Users" value={dashboardData?.totalUsers ?? 0} color="purple" />
          <StatCard title="Devices" value={dashboardData?.totalDevices ?? 0} color="amber" />
          <StatCard title="Vehicles" value={dashboardData?.totalVehicles ?? 0} color="green" />
          <StatCard title="Active Devices" value={dashboardData?.activeDevices ?? 0} color="teal" />
          <StatCard title="Active Vehicles" value={dashboardData?.activeVehicles ?? 0} color="pink" />
        </div>

        {/* System Stats */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
            System Statistics
          </h2>
          {systemStats ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <StatRow label="Total Operators" value={systemStats.totalOperators} />
              <StatRow label="Total Users" value={systemStats.totalUsers} />
              <StatRow label="Total Devices" value={systemStats.totalDevices} />
              <StatRow label="Total Vehicles" value={systemStats.totalVehicles} />
              <StatRow label="Active Devices" value={systemStats.activeDevices} />
              <StatRow label="Active Vehicles" value={systemStats.activeVehicles} />
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No system data available</p>
          )}
        </div>

        {/* Users by Role */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
            Users by Role
          </h2>
          {dashboardData?.usersByRole?.length ? (
            <table className="min-w-full border text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="p-3 text-left font-medium">Role ID</th>
                  <th className="p-3 text-left font-medium">User Count</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.usersByRole.map((r) => (
                  <tr
                    key={r._id}
                    className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <td className="p-3 text-gray-800 dark:text-gray-200">{r._id}</td>
                    <td className="p-3 text-gray-800 dark:text-gray-200">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No role data available</p>
          )}
        </div>

        {/* Recent Tracking */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
            Recent GPS Tracking
          </h2>
          {liveTracking.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                  <tr>
                    <th className="p-3 text-left font-medium">Tracker ID</th>
                    <th className="p-3 text-left font-medium">Device ID</th>
                    <th className="p-3 text-left font-medium">Latitude</th>
                    <th className="p-3 text-left font-medium">Longitude</th>
                    <th className="p-3 text-left font-medium">Speed (km/h)</th>
                    <th className="p-3 text-left font-medium">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {liveTracking.slice(0, 10).map((item) => (
                    <tr
                      key={item.tracking_data_id}
                      className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <td className="p-3 text-gray-800 dark:text-gray-200">{item.tracker_id}</td>
                      <td className="p-3 text-gray-800 dark:text-gray-200">{item.gps_device_id}</td>
                      <td className="p-3 text-gray-800 dark:text-gray-200">
                        {item.latitude.toFixed(4)}
                      </td>
                      <td className="p-3 text-gray-800 dark:text-gray-200">
                        {item.longitude.toFixed(4)}
                      </td>
                      <td className="p-3 text-gray-800 dark:text-gray-200">{item.speed}</td>
                      <td className="p-3 text-gray-500 dark:text-gray-400">
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No recent tracking data available</p>
          )}
        </div>
      </div>
    </>
  );
}

/* ✅ Components */
function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
    amber: "text-amber-600 dark:text-amber-400",
    green: "text-green-600 dark:text-green-400",
    teal: "text-teal-600 dark:text-teal-400",
    pink: "text-pink-600 dark:text-pink-400",
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className={`text-2xl font-semibold mt-1 ${colorClasses[color ?? "blue"]}`}>{value}</p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-gray-700 dark:text-gray-200">
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
