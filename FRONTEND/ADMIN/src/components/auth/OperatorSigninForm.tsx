import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";

const OperatorLoginForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setError("");

  if (!email || !password) {
    setError("Email and password are required");
    return;
  }

  setLoading(true);
  try {
    const role = await login({ email, password, role: "operator" });

    if (role === "operator") {
      navigate("/operator/dashboard");
    } else {
      // fallback — if somehow wrong role logs in
      navigate("/superadmin/dashboard");
    }
  } catch (err: any) {
    setError(err.message || "Invalid operator credentials");
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <h1 className="mb-4 font-semibold text-gray-800 text-title-sm dark:text-white/90">
          Operator Login
        </h1>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Enter operator email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                >
                  {showPassword ? (
                    <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                  ) : (
                    <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                  )}
                </span>
              </div>
            </div>

            <Button className="w-full" size="sm" disabled={loading} type="submit">
              {loading ? "Signing in..." : "Login as Operator"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OperatorLoginForm;
