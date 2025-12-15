export interface Operator {
  _id?: string;
  operator_id?: string;
  name?: string;
  full_name?: string;
  email: string;
  phone?: string;
  phone_number?: string;
  registration_number?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  status: boolean;
}

export interface Device {
  _id?: string;
  device_id?: string;
  device_name?: string;
  imei?: string;
  sim_number?: string;
  assigned_vehicle_id?: string;
  status: boolean;
  battery_level?: number;
}

export interface Driver {
  name: string;
  user_id: string;
  assigned_vehicle_id?: string;
}

export interface Vehicle {
  vehicle_number: string;
  vehicle_id?: string;
  _id?: string;
  assigned_driver_id?: string;
  assigned_device_id?: string;
}
