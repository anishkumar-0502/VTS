import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import { InfoIcon } from "../../icons";

type BadgeColorVariant =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

interface LiveVehicleRow {
  vehicleId: string | null;
  vehicleNumber: string | null;
  operatorId: string | null;
  operatorName: string | null;
  trackerId: string | null;
  latitude: number | null;
  longitude: number | null;
  speed: number;
  status: string;
  lastUpdate: string | null;
}

interface LiveVehiclesProps {
  liveVehicles: LiveVehicleRow[];
  loading: boolean;
  onVehicleNavigate?: (vehicle: LiveVehicleRow) => void;
}

const statusLabels: Record<string, string> = {
  active: "Active",
  idle: "Idle",
  maintenance: "Maintenance",
  offline: "Offline",
};

const statusColors: Record<string, BadgeColorVariant> = {
  active: "success",
  idle: "warning",
  maintenance: "error",
  offline: "light",
};

const summaryStatuses = ["active", "idle", "maintenance", "offline"];

const resolveVehicleLabel = (vehicle: LiveVehicleRow) =>
  vehicle.vehicleNumber || vehicle.vehicleId || "Unknown vehicle";

const resolveDeviceLabel = (vehicle: LiveVehicleRow) => vehicle.trackerId || "-";

const formatStatusLabel = (status: string) => {
  const key = status?.toLowerCase() ?? "";
  if (statusLabels[key]) {
    return statusLabels[key];
  }
  if (!status) {
    return "Unknown";
  }
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatLastUpdate = (iso: string | null) => {
  if (!iso) {
    return "Unknown";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleString();
};

const formatSpeed = (speed: number) => {
  if (!Number.isFinite(speed)) {
    return "0.0 km/h";
  }
  return `${speed.toFixed(1)} km/h`;
};

export default function RecentOrders({
  liveVehicles,
  loading,
  onVehicleNavigate,
}: LiveVehiclesProps) {
  const statusCounts = liveVehicles.reduce<Record<string, number>>((acc, vehicle) => {
    const key = vehicle.status?.toLowerCase() ?? "";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const summaryCards = summaryStatuses.map((status) => ({
    status,
    label: statusLabels[status] ?? status,
    value: statusCounts[status] ?? 0,
  }));

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Live Vehicles
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Connected trackers with recent telemetry
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge size="sm" color="primary">
            {loading ? "..." : liveVehicles.length}
          </Badge>
          <div className="group relative hidden sm:block">
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
            >
              <InfoIcon className="size-4" />
            </button>
            <div className="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden w-72 rounded-xl border border-gray-200 bg-white p-4 text-left text-xs shadow-xl group-hover:flex group-focus-within:flex dark:border-gray-700 dark:bg-gray-900">
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">🚗 Idle</p>
                <p className="mt-1 text-gray-600 dark:text-gray-300">
                  Meaning: The vehicle’s device is connected and sending data, but the vehicle is not moving.
                </p>
              </div>
              <div className="mt-3">
                <p className="font-semibold text-gray-800 dark:text-white">❌ Offline</p>
                <p className="mt-1 text-gray-600 dark:text-gray-300">
                  Meaning: The tracker is not communicating with the VTS server.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.status}
            className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/5 dark:text-gray-300"
          >
            <div className="flex items-center justify-between gap-3">
              <span>{card.label}</span>
              <Badge size="sm" color={statusColors[card.status] ?? "light"}>
                {loading ? "..." : card.value}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Vehicle
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Device
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Status
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Speed
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Last Update
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Tracking
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-4 text-center text-gray-500 dark:text-gray-400"
                >
                  Loading live vehicles...
                </TableCell>
              </TableRow>
            ) : liveVehicles.length ? (
              liveVehicles.map((vehicle) => {
                const statusKey = vehicle.status?.toLowerCase() ?? "";
                const badgeColor = statusColors[statusKey] ?? "light";

                return (
                  <TableRow
                    key={`${vehicle.vehicleId ?? vehicle.vehicleNumber ?? vehicle.trackerId}`}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                          {resolveVehicleLabel(vehicle)}
                        </p>
                        <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                          {vehicle.operatorName || vehicle.operatorId || "Unassigned"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {resolveDeviceLabel(vehicle)}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      <Badge size="sm" color={badgeColor}>
                        {formatStatusLabel(vehicle.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {formatSpeed(vehicle.speed)}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {formatLastUpdate(vehicle.lastUpdate)}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onVehicleNavigate?.(vehicle)}
                        disabled={!onVehicleNavigate}
                        className="text-theme-sm font-semibold text-primary-600 transition hover:text-primary-700 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-primary-400 dark:hover:text-primary-300 dark:disabled:text-gray-500"
                      >
                        View
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-4 text-center text-gray-500 dark:text-gray-400"
                >
                  No live-connected vehicles.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
