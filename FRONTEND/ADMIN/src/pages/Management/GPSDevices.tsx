import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import GPSDevicesTable from "../../components/tables/GPSDevicesTable";
import GPSDeviceForm from "../../components/forms/GPSDeviceForm";
import Button from "../../components/ui/button/Button";

interface GPSDevice {
  _id: string;
  device_id: string;
  imei: string;
  sim_number: string;
  status: boolean;
  battery_level?: number;
  created_at: string;
}

export default function GPSDevices() {
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<GPSDevice | null>(null);

  const handleEdit = (device: GPSDevice) => {
    setEditingDevice(device);
    setShowForm(true);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditingDevice(null);
  };

  return (
    <>
      <PageMeta
        title="GPS Devices Management | VTS Admin"
        description="Manage GPS devices"
      />
      <div>
        <PageBreadCrumb pageTitle="GPS Devices" />

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-title-md font-bold text-gray-900 dark:text-white">
              Manage GPS Devices
            </h2>
            <Button
              onClick={() => {
                setEditingDevice(null);
                setShowForm(true);
              }}
              size="sm"
            >
              Register Device
            </Button>
          </div>

          {showForm && (
            <div className="mb-8 rounded-lg bg-gray-50 p-6 dark:bg-gray-800/50">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {editingDevice ? "Edit Device" : "Register New Device"}
              </h3>
              <GPSDeviceForm
                device={editingDevice || undefined}
                onSuccess={handleSuccess}
                onCancel={() => {
                  setShowForm(false);
                  setEditingDevice(null);
                }}
              />
            </div>
          )}

          <GPSDevicesTable
            onEdit={handleEdit}
            onDelete={() => handleSuccess()}
          />
        </div>
      </div>
    </>
  );
}
