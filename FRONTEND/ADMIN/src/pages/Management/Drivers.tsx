import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import DriversFullTable from "../../components/tables/DriversFullTable";
import DriverForm from "../../components/forms/DriverForm";
import Button from "../../components/ui/button/Button";

interface Driver {
  _id: string;
  full_name: string;
  email: string;
  phone_number: string;
  status: boolean;
  created_at: string;
}

export default function Drivers() {
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setShowForm(true);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditingDriver(null);
  };

  return (
    <>
      <PageMeta
        title="Drivers Management | VTS Admin"
        description="Manage drivers"
      />
      <div>
        <PageBreadCrumb pageTitle="Drivers" />

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-title-md font-bold text-gray-900 dark:text-white">
              Manage Drivers
            </h2>
            <Button
              onClick={() => {
                setEditingDriver(null);
                setShowForm(true);
              }}
              size="sm"
            >
              Add Driver
            </Button>
          </div>

          {showForm && (
            <div className="mb-8 rounded-lg bg-gray-50 p-6 dark:bg-gray-800/50">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {editingDriver ? "Edit Driver" : "Add New Driver"}
              </h3>
              <DriverForm
                driver={editingDriver ? { ...editingDriver, name: editingDriver.full_name } : undefined}
                onSuccess={handleSuccess}
                onCancel={() => {
                  setShowForm(false);
                  setEditingDriver(null);
                }}
              />
            </div>
          )}

          <DriversFullTable
            onEdit={(driver) => handleEdit({ ...driver, full_name: driver.full_name })}
            onDelete={() => handleSuccess()}
          />
        </div>
      </div>
    </>
  );
}
