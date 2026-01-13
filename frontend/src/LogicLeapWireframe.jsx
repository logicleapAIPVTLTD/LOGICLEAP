import { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './components/Dashboard';
import BOQGenerator from './components/BOQGenerator';
import POSTPredictor from './components/POSTPredictor';
import WBS from './components/WBS';
import BOM from './components/BOM';


const LogicLeapWireframe = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedProject, setSelectedProject] = useState('Office Interior - TechCorp');
  const [postResult, setPostResult] = useState(null);
  const [selectedBOQItems, setSelectedBOQItems] = useState([]);


  // Mock data
  const projects = [
    { id: 1, name: 'Office Interior - TechCorp', status: 'on-track', progress: 65, delay: 0, budget: 95 },
    { id: 2, name: 'Residential Villa - Sharma', status: 'at-risk', progress: 40, delay: 5, budget: 108 },
    { id: 3, name: 'Tank Cleaning - Factory A', status: 'delayed', progress: 75, delay: 12, budget: 102 },
    { id: 4, name: 'Retail Fitout - Fashion Store', status: 'on-track', progress: 30, delay: 0, budget: 98 }
  ];

  // Render main content based on active view
  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveView} />;

      case 'boq-generator':
        return <BOQGenerator 
          setActiveView={setActiveView} 
          setSelectedBOQItems={setSelectedBOQItems}/>;
      case 'wbs-creator':
        return <WBS setActiveView={setActiveView} initialItems={selectedBOQItems} />;

      case 'bom-generator':
        return <BOM setActiveView={setActiveView} setPostResult={setPostResult} postResult={postResult}/>;
      case 'post-predictor':
        return (
          <POSTPredictor
            postResult={postResult}
          />
        );
      default:
        return (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {activeView.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h3>
            <p className="text-gray-600">This section is under construction</p>
            <p className="text-sm text-gray-500 mt-2">Feature coming soon</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          projects={projects}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default LogicLeapWireframe;
