import { useMemo } from "react";
import { ApexOptions } from "apexcharts";
import Chart from "react-apexcharts";
import ChartTab from "../common/ChartTab";

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

interface OperatorPerformanceProps {
  operators: OperatorStat[];
  loading: boolean;
}

export default function StatisticsChart({ operators, loading }: OperatorPerformanceProps) {
  const categories = operators.map((operator) => operator.operatorName || operator.operatorId);
  const activeData = operators.map((operator) => operator.activeVehicles);
  const issueData = operators.map((operator) => operator.issueVehicles);

  const displayCategories = categories.length ? categories : ["No operators"];
  const displayActive = activeData.length ? activeData : [0];
  const displayIssues = issueData.length ? issueData : [0];

  const options: ApexOptions = useMemo(
    () => ({
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "left",
      },
      colors: ["#465FFF", "#9CB9FF"],
      chart: {
        fontFamily: "Outfit, sans-serif",
        height: 310,
        type: "area",
        toolbar: {
          show: false,
        },
      },
      stroke: {
        curve: "straight",
        width: [2, 2],
      },
      fill: {
        type: "gradient",
        gradient: {
          opacityFrom: 0.55,
          opacityTo: 0,
        },
      },
      markers: {
        size: 0,
        strokeColors: "#fff",
        strokeWidth: 2,
        hover: {
          size: 6,
        },
      },
      grid: {
        xaxis: {
          lines: {
            show: false,
          },
        },
        yaxis: {
          lines: {
            show: true,
          },
        },
      },
      dataLabels: {
        enabled: false,
      },
      tooltip: {
        enabled: true,
        x: {
          show: false,
        },
        y: {
          formatter: (val: number) => `${val} vehicles`,
        },
      },
      xaxis: {
        type: "category",
        categories: displayCategories,
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        labels: {
          style: {
            fontSize: "12px",
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            fontSize: "12px",
            colors: ["#6B7280"],
          },
        },
      },
    }),
    [displayCategories]
  );

  const series = useMemo(
    () => [
      {
        name: "Active Vehicles",
        data: displayActive,
      },
      {
        name: "Vehicles with Issues",
        data: displayIssues,
      },
    ],
    [displayActive, displayIssues]
  );

  const averageUtilization = operators.length
    ? (operators.reduce((sum, operator) => sum + operator.utilizationRate, 0) / operators.length).toFixed(1)
    : "0.0";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Operator Performance
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            {loading
              ? "Evaluating operator utilization and issue trends..."
              : `Average utilization ${averageUtilization}% across top operators`}
          </p>
        </div>
        <div className="flex items-start w-full gap-3 sm:justify-end">
          <ChartTab />
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          <Chart options={options} series={series} type="area" height={310} />
        </div>
      </div>
    </div>
  );
}
