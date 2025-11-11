import { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";

interface RouteDetailData {
  routeName: string;
  averageSpeed: number;
  activeVehicles: number;
  issueVehicles: number;
  stopCount: number;
}

interface SlowRouteCardProps {
  routes: RouteDetailData[];
  loading: boolean;
}

export default function DemographicCard({ routes, loading }: SlowRouteCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const displayRoutes = routes.length ? routes : [];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Slowest Routes
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Ranked by average speed across active vehicles
          </p>
        </div>
        <div className="relative inline-block">
          <button className="dropdown-toggle" onClick={toggleDropdown}>
            <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-6" />
          </button>
          <Dropdown
            isOpen={isOpen}
            onClose={closeDropdown}
            className="w-40 p-2"
          >
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              View Route Details
            </DropdownItem>
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Export Slow Routes
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {loading ? (
          <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Loading route analytics...
          </div>
        ) : displayRoutes.length ? (
          displayRoutes.map((route) => (
            <div key={`${route.routeName}-${route.stopCount}`} className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800 text-theme-sm dark:text-white/90">
                  {route.routeName || "Unnamed Route"}
                </p>
                <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                  Stops: {route.stopCount} • Active Vehicles: {route.activeVehicles}
                </span>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-800 text-theme-sm dark:text-white/90">
                  {route.averageSpeed.toFixed(1)} km/h
                </p>
                <span className="block text-theme-xs text-warning-600 dark:text-warning-400">
                  Issues: {route.issueVehicles}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            No slow routes detected in the current monitoring window.
          </div>
        )}
      </div>
    </div>
  );
}
