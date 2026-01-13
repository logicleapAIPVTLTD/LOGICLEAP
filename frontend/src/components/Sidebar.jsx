import { Home, FileText, Menu, X } from "lucide-react";

const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
  activeView,
  setActiveView,
}) => {
  const navItems = [
    { id: "dashboard", icon: Home, label: "Dashboard" },
    {
      id: "planning",
      icon: FileText,
      label: "Project Planning",
      subItems: [
        { id: "boq-generator", label: "BOQ Generator" }, // renamed
        { id: "wbs-creator", label: "WBS Creator" },
        { id: "bom-generator", label: "BOM Generator" },
        { id: "post-predictor", label: "COST Predictor" }, // renamed
      ],
    },
  ];

  const isSubItemActive = (item) => {
    if (!item.subItems) return false;
    return item.subItems.some((subItem) => subItem.id === activeView);
  };

  return (
    <div
      className={`${
        sidebarOpen ? "w-64" : "w-16"
      } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
              LL
            </div>
            <span className="font-bold text-gray-900">Logic Leap</span>
          </div>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-gray-500 hover:text-gray-700"
        >
          {sidebarOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {navItems.map((item) => {
          const isParentActive = activeView === item.id;
          const hasActiveChild = isSubItemActive(item);
          const shouldShowSubItems = isParentActive || hasActiveChild;

          return (
            <div key={item.id} className="mb-1">
              <button
                onClick={() => {
                  if (item.subItems && item.subItems.length > 0) {
                    setActiveView(item.subItems[0].id);
                  } else {
                    setActiveView(item.id);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isParentActive || hasActiveChild
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {sidebarOpen && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </button>
              {sidebarOpen && item.subItems && shouldShowSubItems && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.id}
                      onClick={() => setActiveView(subItem.id)}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded transition-colors ${
                        activeView === subItem.id
                          ? "bg-blue-100 text-blue-700 font-medium"
                          : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                      }`}
                    >
                      {subItem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
