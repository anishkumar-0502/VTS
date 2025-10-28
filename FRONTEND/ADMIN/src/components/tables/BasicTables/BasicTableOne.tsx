import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";

import Badge from "../../ui/badge/Badge";
import { driversAPI } from '../../../services/api';

interface Driver {
  _id: string;
  full_name: string;
  phone_number: string;
  license_number: string;
  status: boolean;
  assigned_vehicles?: any[];
}

export default function BasicTableOne() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        setLoading(true);
        const response = await driversAPI.getAll();
        if (response.success && Array.isArray(response.data)) {
          setDrivers(response.data.slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching drivers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  const getDriverImage = (index: number) => {
    const images = [
      "/images/user/user-17.jpg",
      "/images/user/user-18.jpg",
      "/images/user/user-20.jpg",
      "/images/user/user-21.jpg",
      "/images/user/user-22.jpg",
    ];
    return images[index % images.length];
  };

  const getTeamImages = (index: number) => {
    const allImages = [
      "/images/user/user-22.jpg",
      "/images/user/user-23.jpg",
      "/images/user/user-24.jpg",
      "/images/user/user-25.jpg",
      "/images/user/user-26.jpg",
      "/images/user/user-27.jpg",
      "/images/user/user-28.jpg",
      "/images/user/user-29.jpg",
      "/images/user/user-30.jpg",
    ];
    return allImages.slice(index * 2, (index + 1) * 2);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table>
          {/* Table Header */}
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Driver
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                License Number
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Phone
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Status
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Vehicles
              </TableCell>
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="px-5 py-4 text-center text-gray-500">
                  Loading...
                </TableCell>
              </TableRow>
            ) : drivers.length > 0 ? (
              drivers.map((driver, index) => (
                <TableRow key={driver._id}>
                  <TableCell className="px-5 py-4 sm:px-6 text-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 overflow-hidden rounded-full">
                        <img
                          width={40}
                          height={40}
                          src={getDriverImage(index)}
                          alt={driver.full_name}
                        />
                      </div>
                      <div>
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {driver.full_name}
                        </span>
                        <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                          Driver
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {driver.license_number || 'N/A'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {driver.phone_number}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    <Badge
                      size="sm"
                      color={driver.status ? "success" : "error"}
                    >
                      {driver.status ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    <div className="flex -space-x-2">
                      {getTeamImages(index).map((teamImage, imgIndex) => (
                        <div
                          key={imgIndex}
                          className="w-6 h-6 overflow-hidden border-2 border-white rounded-full dark:border-gray-900"
                        >
                          <img
                            width={24}
                            height={24}
                            src={teamImage}
                            alt={`Vehicle ${imgIndex + 1}`}
                            className="w-full size-6"
                          />
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="px-5 py-4 text-center text-gray-500">
                  No drivers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
