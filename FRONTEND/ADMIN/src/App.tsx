import { BrowserRouter as Router, Routes, Route } from "react-router";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import GoogleMaps from "./pages/Maps/GoogleMaps";
import VectorMaps from "./pages/Maps/VectorMaps";
import Operators from "./pages/Management/Operators";
import Vehicles from "./pages/Management/Vehicles";
import Drivers from "./pages/Management/Drivers";
import DriverManagement from "./pages/Management/DeviceManagement";
import OperatorManageDevice from "./pages/Management/OperatorManageDevice";
import Roles from "./pages/Management/Roles";
import LiveTracking from "./pages/Management/LiveTracking";
import { AuthProvider } from "./context/AuthContext";
import AppUsers from "./pages/Management/AppUsers";
import SuperadminAppUsers from "./pages/Management/SuperadminAppUsers";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthGuard } from "./components/AuthGuard";
import SuperAdminLogin from "./pages/AuthPages/SuperAdminLogin";
import OperatorLogin from "./pages/AuthPages/OperatorLogin";
import User from "./pages/Management/User";
import AssignDevice from "./pages/Management/AssignDevice";
import DeviceManagement from "./pages/Management/DeviceManagement";
import AssignDeviceToVehicle from "./pages/Management/AssignDevicetoVehicle";
import AssignDriverToVehicle from "./pages/Management/AssignDrivertoVehicle";
import ManageAllUsers from "./pages/Management/ManageAllUsers";
import ManageEndUser from "./pages/Management/ManageUser";
import ManageTrips from "./pages/Management/ManageTrips";
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout - Protected */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              path="/"
              element={
                <ProtectedRoute permission="view_dashboard">
                  <Home />
                </ProtectedRoute>
              }
            />

            {/* Others Page */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute permission="view_dashboard">
                  <UserProfiles />
                </ProtectedRoute>
              }
            />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/googleMaps" element={<GoogleMaps />} />
            <Route path="/vectorMaps" element={<VectorMaps />} />
            <Route path="/blank" element={<Blank />} />

            {/* Forms */}
            <Route path="/form-elements" element={<FormElements />} />

            {/* Tables */}
            <Route path="/basic-tables" element={<BasicTables />} />

            {/* Ui Elements */}
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />

            {/* Charts */}
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />

            {/* Management */}
            <Route
              path="/manage-operators"
              element={
                <ProtectedRoute permission="manage_users">
                  <Operators />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-vehicles"
              element={
                <ProtectedRoute permission="view_devices">
                  <Vehicles />
                </ProtectedRoute>
              }
            />
             <Route
             path="/view-user"
              element={
                <ProtectedRoute permission="manage_users">
                  <User />
                </ProtectedRoute>
              }
            />
            {/* <Route
  path="/manage-all-users"
  element={
    <ProtectedRoute permission="manage_users">
      <ManageAllUsers />
    </ProtectedRoute>
  }
/> */}
<Route
  path="/manage-users"
  element={
    <ProtectedRoute permission="manage_users">
      <ManageEndUser />
    </ProtectedRoute>
  }
/>
             <Route
              path="/manage-device"
              element={
                <ProtectedRoute permission="view_devices">
                  <DeviceManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-drivers"
              element={
                <ProtectedRoute permission="view_devices">
                  <Drivers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-trips"
              element={
                <ProtectedRoute permission="view_devices">
                  <ManageTrips />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assign-device-to-operator"
              element={
                <ProtectedRoute permission="manage_alerts">
                  <AssignDevice />
                </ProtectedRoute>
              }
            />
             <Route
              path="/assign-device-to-vehicle"
              element={
                <ProtectedRoute permission="manage_alerts">
                  <AssignDeviceToVehicle />
                </ProtectedRoute>
              }
            />
              <Route
              path="/assign-driver-to-vehicle"
              element={
                <ProtectedRoute permission="manage_alerts">
                  <AssignDriverToVehicle />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operator-manage-device"
              element={
                <ProtectedRoute permission="manage_devices">
                  <OperatorManageDevice />
                </ProtectedRoute>
              }
            />
            <Route
              path="/live-tracking"
              element={
                <ProtectedRoute permission="view_telemetry">
                  <LiveTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-roles"
              element={
                <ProtectedRoute permission="manage_roles">
                  <Roles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver-management"
              element={
                <ProtectedRoute permission="manage_users">
                  <DriverManagement />
                </ProtectedRoute>
              }
            />
          </Route>
            <Route
              path="/manage-users"
              element={
                <ProtectedRoute permission="manage_users">
                  <AppUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/-users"
              element={
                <ProtectedRoute permission="manage_users">
                  <SuperadminAppUsers />
                </ProtectedRoute>
              }
            />

          {/* Auth Layout */}
          <Route
            path="/superadminlogin"
            element={
              <AuthGuard>
                <SuperAdminLogin />
              </AuthGuard>
            }
          />
         <Route
  path="/operatorlogin"
  element={
    <AuthGuard>
      <OperatorLogin />
    </AuthGuard>
  }
/>

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

