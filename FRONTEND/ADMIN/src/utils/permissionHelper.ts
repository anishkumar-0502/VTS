import { Permissions } from '../context/AuthContext';

export const PERMISSION_MAP = {
  dashboard: 'view_dashboard',
  operators: 'manage_users',
  vehicles: 'view_devices',
  drivers: 'view_devices',
  alerts: 'manage_alerts',
  gpsDevices: 'manage_devices',
  profile: 'view_dashboard',
};

export const canAccessMenuItem = (
  permission: string | undefined,
  permissions: Permissions | null
): boolean => {
  if (!permission) return true;
  if (!permissions) return false;
  return permissions[permission as keyof Permissions] ?? false;
};
