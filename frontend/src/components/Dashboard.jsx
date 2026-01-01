import { Home, FileText, ShoppingCart, Activity, CheckCircle, DollarSign, AlertTriangle, TrendingUp, Plus, Calendar, FileBarChart } from 'lucide-react';
import StatCard from './StatCard';
import QuickActionCard from './QuickActionCard';

const Dashboard = ({ onNavigate }) => {
  const projects = [
    { id: 1, name: 'Office Interior - TechCorp', status: 'on-track', progress: 65, delay: 0, budget: 95 },
    { id: 2, name: 'Residential Villa - Sharma', status: 'at-risk', progress: 40, delay: 5, budget: 108 },
    { id: 3, name: 'Tank Cleaning - Factory A', status: 'delayed', progress: 75, delay: 12, budget: 102 },
    { id: 4, name: 'Retail Fitout - Fashion Store', status: 'on-track', progress: 30, delay: 0, budget: 98 }
  ];

  const statusColors = {
    'on-track': 'bg-green-500',
    'at-risk': 'bg-yellow-500',
    'delayed': 'bg-red-500'
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Active Projects"
          value="12"
          change="+2 this month"
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="On-Time Rate"
          value="75%"
          change="+15% vs last month"
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Budget Health"
          value="₹42.5L"
          change="96% utilization"
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="AI Predictions"
          value="3 Risks"
          change="Action needed"
          icon={AlertTriangle}
          color="orange"
        />
      </div>

      {/* AI Insights Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="bg-blue-500 rounded-full p-2 mt-1">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">AI Insight: Potential Delay Detected</h3>
            <p className="text-sm text-gray-700 mb-2">
              Project "Residential Villa - Sharma" has 70% probability of 7-day delay due to material procurement issues. Vendor ABC has delivery delay pattern.
            </p>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                View Recommendations
              </button>
              <button className="px-3 py-1 border border-blue-600 text-blue-600 text-sm rounded hover:bg-blue-50">
                Create Action Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BOQ Generator CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Create Your BOQ in Minutes</h2>
            <p className="text-blue-100 mb-4">
              Use AI to extract BOQ items from text or manually add items with rate predictions
            </p>
            <button 
              onClick={() => onNavigate('boq-generator')}
              className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Open BOQ Generator
            </button>
          </div>
          <div className="hidden md:block">
            <FileText className="w-24 h-24 text-blue-300 opacity-50" />
          </div>
        </div>
      </div>

      {/* Projects Overview */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Project Portfolio</h2>
          <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Progress</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Schedule</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Budget</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {projects.map(project => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{project.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white ${statusColors[project.status]}`}>
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      {project.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{width: `${project.progress}%`}}></div>
                      </div>
                      <span className="text-sm text-gray-600 w-10">{project.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm ${project.delay > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {project.delay > 0 ? `+${project.delay} days` : 'On time'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm ${project.budget > 100 ? 'text-red-600' : 'text-gray-900'}`}>
                      {project.budget}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Milestones */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Upcoming Milestones</h3>
          <div className="space-y-3">
            {[
              { project: 'TechCorp Office', milestone: 'Electrical Installation Complete', due: '2 days', status: 'on-track' },
              { project: 'Sharma Villa', milestone: 'Plumbing Sign-off', due: '5 days', status: 'at-risk' },
              { project: 'Factory Tank A', milestone: 'Final QC Inspection', due: '1 day', status: 'on-track' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 border border-gray-100 rounded hover:bg-gray-50">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">{item.milestone}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{item.project}</div>
                  <div className="text-xs text-gray-500 mt-1">Due in {item.due}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${item.status === 'on-track' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionCard 
              icon={FileText} 
              label="Create BOQ" 
              color="blue" 
              onClick={() => onNavigate('boq-generator')}
            />
            <QuickActionCard 
              icon={ShoppingCart} 
              label="New PO" 
              color="green" 
            />
            <QuickActionCard 
              icon={Activity} 
              label="Site Update" 
              color="purple" 
            />
            <QuickActionCard 
              icon={FileBarChart} 
              label="View Reports" 
              color="orange" 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

