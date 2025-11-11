import { useMemo, useState } from "react";
import { ApexOptions } from "apexcharts";
import Chart from "react-apexcharts";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";

interface AlertSummaryProps {
  summary?: {
    totalAlerts24h: number;
    alertsByType: { type: string | null; label: string; count: number }[];
    topAlertType: string | null;
  };
  loading: boolean;
}

export default function MonthlySalesChart({ summary, loading }: AlertSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);

  const categories = summary?.alertsByType?.map((item) => item.label) ?? [];
  const counts = summary?.alertsByType?.map((item) => item.count ?? 0) ?? [];
  const displayCategories = categories.length ? categories : ["No alerts"];
  const displayData = counts.length ? counts : [0];
  const totalAlerts = summary?.totalAlerts24h ?? 0;

  const options: ApexOptions = useMemo(
    () => ({
      colors: ["#465fff"],
      chart: {
        fontFamily: "Outfit, sans-serif",
        type: "bar",
        height: 200,
        toolbar: {
          show: false,
        },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "45%",
          borderRadius: 6,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        width: 3,
        colors: ["transparent"],
      },
      xaxis: {
        categories: displayCategories,
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        labels: {
          rotate: -15,
          style: {
            fontSize: "12px",
          },
        },
      },
      legend: {
        show: false,
      },
      yaxis: {
        labels: {
          style: {
            fontSize: "12px",
            colors: ["#6B7280"],
          },
        },
      },
      grid: {
        yaxis: {
          lines: {
            show: true,
          },
        },
      },
      fill: {
        opacity: 1,
      },
      tooltip: {
        x: {
          show: false,
        },
        y: {
          formatter: (val: number) => `${val} alerts`,
        },
      },
    }),
    [displayCategories]
  );

  const series = useMemo(
    () => [
      {
        name: "Alerts",
        data: displayData,
      },
    ],
    [displayData]
  );

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Alert Summary (24h)
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Top triggers from the last 24 hours
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
              Refresh
            </DropdownItem>
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              View All Alerts
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      <div className="mt-4 text-xs font-medium text-gray-500 dark:text-gray-400">
        Total alerts: {loading ? "..." : totalAlerts}
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[420px] xl:min-w-full pl-2">
          <Chart options={options} series={series} type="bar" height={200} />
        </div>
      </div>
    </div>
  );
}
