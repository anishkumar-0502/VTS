import type { ReactNode } from "react";
import { ArrowUpIcon, GroupIcon, UserIcon } from "../../icons";
import Badge from "../ui/badge/Badge";

interface FleetOverviewMetricsProps {
  metrics?: {
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
  };
  loading: boolean;
  role?: "superadmin" | "operator";
}

interface MetricCard {
  key: string;
  label: string;
  value: string;
  icon: ReactNode;
  badgeText?: string;
  badgeColor?: "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";
  footerText?: string;
}

const numberFormatter = new Intl.NumberFormat("en-IN");

const formatNumber = (value: number) => numberFormatter.format(value);

export default function EcommerceMetrics({ metrics, loading, role }: FleetOverviewMetricsProps) {
  const totalVehicles = metrics?.totalVehicles ?? 0;
  const activeVehicles = metrics?.activeVehicles ?? 0;
  const idleVehicles = metrics?.idleVehicles ?? 0;
  const totalOperators = metrics?.totalOperators ?? 0;
  const totalTrackers = metrics?.totalTrackers ?? 0;
  const activeTrackers = metrics?.activeTrackers ?? 0;
  const utilization = metrics ? Number(metrics.utilizationRate.toFixed(1)) : 0;
  const totalEndUsers = metrics?.totalEndUsers ?? 0;
  const isOperatorView = role === "operator";

  const secondCard: MetricCard = isOperatorView
    ? {
        key: "fleet-end-users",
        label: "Total End Users",
        value: formatNumber(totalEndUsers),
        icon: <UserIcon className="text-gray-800 size-6 dark:text-white/90" />,
        badgeColor: "info",
        footerText: metrics ? `${formatNumber(totalVehicles)} Vehicles` : undefined,
      }
    : {
        key: "fleet-operators",
        label: "Total Operators",
        value: formatNumber(totalOperators),
        icon: <UserIcon className="text-gray-800 size-6 dark:text-white/90" />,
        badgeText: metrics ? `${utilization}% Utilization` : undefined,
        badgeColor: "info",
        footerText: metrics ? `${formatNumber(totalVehicles)} Vehicles` : undefined,
      };

  const cards: MetricCard[] = [
    {
      key: "fleet-total",
      label: "Total Vehicles",
      value: formatNumber(totalVehicles),
      icon: <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />,
      badgeText: metrics ? `${formatNumber(activeVehicles)} Active` : undefined,
      badgeColor: "primary",
      footerText: metrics ? `Idle ${formatNumber(idleVehicles)}` : undefined,
    },
    secondCard,
    {
      key: "fleet-trackers",
      label: "Trackers Online",
      value: formatNumber(activeTrackers),
      icon: <ArrowUpIcon className="text-gray-800 size-5 dark:text-white/90" />,
      badgeText: metrics ? `${formatNumber(totalTrackers)} Total` : undefined,
      badgeColor: "success",
      footerText: metrics ? `Active trackers ${formatNumber(activeTrackers)}` : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
        >
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            {card.icon}
          </div>

          <div className="flex items-end justify-between mt-5">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{card.label}</span>
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                {loading ? "..." : card.value}
              </h4>
              {!loading && card.footerText && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {card.footerText}
                </p>
              )}
            </div>
            {!loading && card.badgeText ? (
              <Badge color={card.badgeColor ?? "light"} size="sm">
                {card.badgeText}
              </Badge>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
