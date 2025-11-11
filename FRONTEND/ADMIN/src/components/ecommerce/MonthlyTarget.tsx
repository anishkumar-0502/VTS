import { Fragment, useMemo, useState } from "react";
import { ApexOptions } from "apexcharts";
import Chart from "react-apexcharts";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";

interface RouteHealthProps {
  routeHealth?: {
    summary: {
      totalRoutes: number;
      activeRoutes: number;
      routesWithIssues: number;
      averageRouteSpeed: number;
      onScheduleRate: number;
    };
  };
  loading: boolean;
}

export default function MonthlyTarget({ routeHealth, loading }: RouteHealthProps) {
  const [isOpen, setIsOpen] = useState(false);
  const summary = routeHealth?.summary;

  const totalRoutes = summary?.totalRoutes ?? 0;
  const activeRoutes = summary?.activeRoutes ?? 0;
  const routesWithIssues = summary?.routesWithIssues ?? 0;
  const averageRouteSpeed = summary ? Number(summary.averageRouteSpeed.toFixed(1)) : 0;
  const onScheduleRate = summary ? Math.max(0, Math.min(100, Number(summary.onScheduleRate.toFixed(1)))) : 0;

  const gaugeValue = loading ? 0 : onScheduleRate;

  const series = useMemo(() => [gaugeValue], [gaugeValue]);

  const options: ApexOptions = useMemo(
    () => ({
      colors: ["#465FFF"],
      chart: {
        fontFamily: "Outfit, sans-serif",
        type: "radialBar",
        height: 330,
        sparkline: {
          enabled: true,
        },
      },
      plotOptions: {
        radialBar: {
          startAngle: -85,
          endAngle: 85,
          hollow: {
            size: "80%",
          },
          track: {
            background: "#E4E7EC",
            strokeWidth: "100%",
            margin: 5,
          },
          dataLabels: {
            name: {
              show: false,
            },
            value: {
              fontSize: "36px",
              fontWeight: "600",
              offsetY: -40,
              color: "#1D2939",
              formatter: (val: number) => `${val.toFixed(1)}%`,
            },
          },
        },
      },
      fill: {
        type: "solid",
        colors: ["#465FFF"],
      },
      stroke: {
        lineCap: "round",
      },
      labels: ["On Schedule"],
    }),
    []
  );

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const quickMetrics = [
    {
      label: "Active Routes",
      value: loading ? "..." : activeRoutes.toString(),
    },
    {
      label: "Routes with Issues",
      value: loading ? "..." : routesWithIssues.toString(),
    },
    {
      label: "Avg Route Speed",
      value: loading ? "..." : `${averageRouteSpeed.toFixed(1)} km/h`,
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-11 dark:bg-gray-900 sm:px-6 sm:pt-6">
        <div className="flex justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Route On-Schedule Rate
            </h3>
            <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
              {loading ? "Calculating fleet performance..." : `Tracking ${totalRoutes} routes`}
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
                Export Report
              </DropdownItem>
            </Dropdown>
          </div>
        </div>
        <div className="relative">
          <div className="max-h-[330px]" id="routeOnScheduleGauge">
            <Chart
              options={options}
              series={series}
              type="radialBar"
              height={330}
            />
          </div>

          <span className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-[95%] rounded-full bg-success-50 px-3 py-1 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
            {loading ? "--" : `${activeRoutes} active`}
          </span>
        </div>
        <p className="mx-auto mt-10 w-full max-w-[380px] text-center text-sm text-gray-500 sm:text-base">
          {loading
            ? "Monitoring real-time route compliance and performance metrics."
            : "On-schedule rate reflects the percentage of routes running without delays or issues."}
        </p>
      </div>

      <div className="flex items-center justify-center gap-5 px-6 py-3.5 sm:gap-8 sm:py-5">
        {quickMetrics.map((metric, index) => (
          <Fragment key={metric.label}>
            <div className="flex flex-col items-center text-center">
              <p className="mb-1 text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">
                {metric.label}
              </p>
              <p className="text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                {metric.value}
              </p>
            </div>
            {index < quickMetrics.length - 1 && (
              <div className="hidden h-7 w-px bg-gray-200 dark:bg-gray-800 sm:block" />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
