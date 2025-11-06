import { useState, useEffect } from "react";
import { operatorsAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import Checkbox from "../form/input/Checkbox";
import Swal from "sweetalert2";


interface Operator {
  _id: string;
  full_name: string;
  email: string;
  status: boolean;
}

interface OperatorFormProps {
  operator?: Operator;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function OperatorForm({ operator, onSuccess, onCancel }: OperatorFormProps) {
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (operator) {
      setName(operator.full_name);
      setEmail(operator.email);
      setStatus(operator.status);
    }
  }, [operator]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Name is required");
    if (!email.trim()) return setError("Email is required");
    if (!phoneNumber.trim()) return setError("Phone number is required");
    if (!companyName.trim()) return setError("Company name is required");

    try {
      setLoading(true);
      let response;

    if (operator) {
  // Update operator
  response = await operatorsAPI.update(operator._id, {
    name,
    company_name: companyName,
    city,
    phone_number: phoneNumber,
  });
} else {
  // Create new operator
  response = await operatorsAPI.create({
    name,
    email,
    phone_number: phoneNumber,
    company_name: companyName,
    registration_number: registrationNumber,
    address,
    city,
    state,
    postal_code: postalCode,
    country,
  });
}


  if (response && (response.data?.success || response.status === 200 || response.status === 201)) {
  Swal.fire({
    icon: "success",
    title: operator ? "Updated Successfully!" : "Created Successfully!",
    timer: 1500,
    showConfirmButton: false,
  });
  onSuccess?.();
} else {
  setError(response?.data?.message || "Operation failed");
}


    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div>
        <Label>Name *</Label>
        <Input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
      </div>

      <div>
        <Label>Email *</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading || !!operator} />
      </div>

      <div>
        <Label>Phone Number *</Label>
        <Input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} disabled={loading} />
      </div>

      <div>
        <Label>Company Name *</Label>
        <Input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={loading} />
      </div>

      <div>
        <Label>Registration Number</Label>
        <Input type="text" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} disabled={loading} />
      </div>

      <div>
        <Label>Address</Label>
        <Input type="text" value={address} onChange={(e) => setAddress(e.target.value)} disabled={loading} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>City</Label>
          <Input type="text" value={city} onChange={(e) => setCity(e.target.value)} disabled={loading} />
        </div>
        <div>
          <Label>State</Label>
          <Input type="text" value={state} onChange={(e) => setState(e.target.value)} disabled={loading} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Postal Code</Label>
          <Input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} disabled={loading} />
        </div>
        <div>
          <Label>Country</Label>
          <Input type="text" value={country} onChange={(e) => setCountry(e.target.value)} disabled={loading} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Checkbox checked={status} onChange={setStatus} disabled={loading} />
        <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Saving..." : operator ? "Update" : "Create"}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 transition rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
