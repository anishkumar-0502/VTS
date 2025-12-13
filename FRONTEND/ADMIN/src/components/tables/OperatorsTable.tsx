import React from "react";
import { Operator, Device } from "../../types"; // Create a types file if needed
import { DeactivateIcon, ActivateIcon } from "../icons/StatusIcons";

interface Props {
  operators: Operator[];
  devices: Device[];
  toggleStatus: (operator_id: string) => void;
  handleView: (operator_id: string) => void;
  handleViewDevices: (operator_id: string) => void;
  assignDevice: (operator_id: string, device_id: string) => void;
}

export default function OperatorsTable({
  operators,
  devices,
  toggleStatus,
  handleView,
  handleViewDevices,
  assignDevice,
}: Props) {
  return (
    <div className="relative w-full overflow-hidden">
      <div className="max-h-[400px] max-w-full overflow-auto">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse table-fixed">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                {["Name", "Email", "Phone", "Assign Device", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {operators.length > 0 ? (
                operators.map((o) => (
                  <tr key={o.operator_id} className="border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-2 whitespace-nowrap">{o.name}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{o.email}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{o.phone || o.phone_number}</td>

                    {/* Assign Device */}
                    <td className="px-3 py-2 whitespace-nowrap" style={{ minWidth: "150px" }}>
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => handleViewDevices(o.operator_id)}
                          className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          View
                        </button>
                        <div className="relative w-full min-w-[120px]">
                          <select
                            defaultValue=""
                            onChange={(e) => assignDevice(o.operator_id, e.target.value)}
                            disabled={devices.filter((d) => !(d as any).assigned_operator_id).length === 0}
                            className="w-full rounded-md border px-2 py-1.5 pr-6 text-sm text-gray-700 bg-white dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {devices.filter((d) => !(d as any).assigned_operator_id).length > 0 ? (
                              <>
                                <option value="" disabled>Select</option>
                                {devices.filter((d) => !(d as any).assigned_operator_id).map((d) => (
                                  <option key={d.device_id} value={d.device_id}>
                                    {d.device_id}
                                  </option>
                                ))}
                              </>
                            ) : (
                              <option value="" disabled>None</option>
                            )}
                          </select>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${o.status ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}>
                        {o.status ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button onClick={() => toggleStatus(o.operator_id)} title={o.status ? "Deactivate Operator" : "Activate Operator"}>
                          {o.status ? <DeactivateIcon /> : <ActivateIcon />}
                        </button>
                        <button onClick={() => handleView(o.operator_id)}>View</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-500 dark:text-gray-400">
                    No operators found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
