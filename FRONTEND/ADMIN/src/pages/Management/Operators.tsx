import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import OperatorsTable from "../../components/tables/OperatorsTable";
import OperatorForm from "../../components/forms/OperatorForm";
import Button from "../../components/ui/button/Button";

interface Operator {
  _id: string;
  full_name: string;
  email: string;
  status: boolean;
  created_at: string;
}

export default function Operators() {
  const [showForm, setShowForm] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);

  const handleEdit = (operator: Operator) => {
    setEditingOperator(operator);
    setShowForm(true);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditingOperator(null);
  };

  return (
    <>
      <PageMeta
        title="Operators Management | VTS Admin"
        description="Manage operators"
      />
      <div>
        <PageBreadCrumb pageTitle="Operators" />

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-title-md font-bold text-gray-900 dark:text-white">
              Manage Operators
            </h2>
            <Button
              onClick={() => {
                setEditingOperator(null);
                setShowForm(true);
              }}
              size="sm"
            >
              Add Operator
            </Button>
          </div>

          {showForm && (
            <div className="mb-8 rounded-lg bg-gray-50 p-6 dark:bg-gray-800/50">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {editingOperator ? "Edit Operator" : "Create New Operator"}
              </h3>
              <OperatorForm
                operator={editingOperator || undefined}
                onSuccess={handleSuccess}
                onCancel={() => {
                  setShowForm(false);
                  setEditingOperator(null);
                }}
              />
            </div>
          )}

          <OperatorsTable
            onEdit={handleEdit}
            onDelete={() => handleSuccess()}
          />
        </div>
      </div>
    </>
  );
}
