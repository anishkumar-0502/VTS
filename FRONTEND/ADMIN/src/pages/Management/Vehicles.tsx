import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import VehiclesFullTable from "../../components/tables/VehiclesFullTable";
import VehicleForm from "../../components/forms/VehicleForm";
import Button from "../../components/ui/button/Button";

interface Vehicle {
  _id: string;
  vehicle_number: string;
  vehicle_type: string;
  model: string;
  status: boolean;
}

export default function Vehicles() {
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowForm(true);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditingVehicle(null);
  };

  return (
    <>
      <PageMeta
        title="Vehicles Management | VTS Admin"
        description="Manage vehicles"
      />
      <div>
        <PageBreadCrumb pageTitle="Vehicles" />

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-title-md font-bold text-gray-900 dark:text-white">
              Manage Vehicles
            </h2>
            <Button
              onClick={() => {
                setEditingVehicle(null);
                setShowForm(true);
              }}
              size="sm"
            >
              Add Vehicle
            </Button>
          </div>

          {showForm && (
            <div className="mb-8 rounded-lg bg-gray-50 p-6 dark:bg-gray-800/50">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}
              </h3>
              <VehicleForm
                vehicle={editingVehicle || undefined}
                onSuccess={handleSuccess}
                onCancel={() => {
                  setShowForm(false);
                  setEditingVehicle(null);
                }}
              />
            </div>
          )}

          <VehiclesFullTable
            onEdit={handleEdit}
            onDelete={() => handleSuccess()}
          />
        </div>
      </div>
    </>
  );
}
