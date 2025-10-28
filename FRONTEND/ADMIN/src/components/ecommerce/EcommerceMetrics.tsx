import { useEffect, useState } from 'react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BoxIconLine,
  GroupIcon,
} from "../../icons";
import Badge from "../ui/badge/Badge";
import { operatorsAPI, vehiclesAPI } from '../../services/api';

export default function EcommerceMetrics() {
  const [operatorsCount, setOperatorsCount] = useState(0);
  const [vehiclesCount, setVehiclesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const [operatorsRes, vehiclesRes] = await Promise.all([
          operatorsAPI.getAll(),
          vehiclesAPI.getAll(),
        ]);

        if (operatorsRes.success && Array.isArray(operatorsRes.data)) {
          setOperatorsCount(operatorsRes.data.length);
        }
        if (vehiclesRes.success && Array.isArray(vehiclesRes.data)) {
          setVehiclesCount(vehiclesRes.data.length);
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {/* <!-- Metric Item Start --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Operators
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {loading ? '...' : operatorsCount}
            </h4>
          </div>
          <Badge color="success">
            <ArrowUpIcon />
            {operatorsCount > 0 ? '+' : '0'}%
          </Badge>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}

      {/* <!-- Metric Item Start --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Vehicles
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {loading ? '...' : vehiclesCount}
            </h4>
          </div>

          <Badge color="error">
            <ArrowDownIcon />
            {vehiclesCount > 0 ? '+' : '0'}%
          </Badge>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}
    </div>
  );
}
