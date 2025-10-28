import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import AlertsFullTable from "../../components/tables/AlertsFullTable";
import AlertForm from "../../components/forms/AlertForm";
import Button from "../../components/ui/button/Button";

interface Alert {
  _id: string;
  alert_type: string;
  description: string;
  severity: string;
  isActive: boolean;
  created_at: string;
}

export default function Alerts() {
  const [showForm, setShowForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);

  const handleEdit = (alert: Alert) => {
    setEditingAlert(alert);
    setShowForm(true);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditingAlert(null);
  };

  return (
    <>
      <PageMeta
        title="Alerts Management | VTS Admin"
        description="Manage alerts"
      />
      <div>
        <PageBreadCrumb pageTitle="Alerts" />

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-title-md font-bold text-gray-900 dark:text-white">
              Manage Alerts
            </h2>
            <Button
              onClick={() => {
                setEditingAlert(null);
                setShowForm(true);
              }}
              size="sm"
            >
              Create Alert
            </Button>
          </div>

          {showForm && (
            <div className="mb-8 rounded-lg bg-gray-50 p-6 dark:bg-gray-800/50">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {editingAlert ? "Edit Alert" : "Create New Alert"}
              </h3>
              <AlertForm
                alert={editingAlert ? { _id: editingAlert._id, alert_type: editingAlert.alert_type, description: editingAlert.description, severity: editingAlert.severity, is_active: editingAlert.isActive } : undefined}
                onSuccess={handleSuccess}
                onCancel={() => {
                  setShowForm(false);
                  setEditingAlert(null);
                }}
              />
            </div>
          )}

          <AlertsFullTable
            onEdit={handleEdit}
            onDelete={() => handleSuccess()}
          />
        </div>
      </div>
    </>
  );
}
