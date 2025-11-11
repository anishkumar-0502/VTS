import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen xl:flex overflow-x-hidden"> {/* ✅ Prevent horizontal scroll */}
      <div className="flex-shrink-0">
        <AppSidebar />
        <Backdrop />
      </div>

      <div
  className={`flex-1 transition-all duration-300 ease-in-out overflow-y-auto overflow-x-hidden no-scrollbar`}
  style={{
    marginLeft:
      isExpanded || isHovered ? "290px" : isMobileOpen ? "0px" : "90px",
  }}
>
  <AppHeader />
<div className="p-4 mx-auto max-w-screen-2xl md:p-6 overflow-y-auto no-scrollbar">    <Outlet />
  </div>
</div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <div className="overflow-x-hidden"> {/* ✅ Global horizontal scroll lock */}
        <LayoutContent />
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
