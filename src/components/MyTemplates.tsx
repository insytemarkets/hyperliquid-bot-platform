import React from 'react';

interface MyTemplate {
  id: string;
  name: string;
  modified: string;
  color: string;
}

interface MyTemplatesProps {
  onEditTemplate: (templateId: string) => void;
  onViewAllTemplates: () => void;
}

const MyTemplates: React.FC<MyTemplatesProps> = ({
  onEditTemplate,
  onViewAllTemplates
}) => {
  const myTemplates: MyTemplate[] = [
    {
      id: '1',
      name: 'Custom Grid v2',
      modified: 'Modified 2 days ago',
      color: 'bg-purple-500'
    },
    {
      id: '2',
      name: 'My DCA Strategy',
      modified: 'Modified 1 week ago',
      color: 'bg-green-500'
    },
    {
      id: '3',
      name: 'Experimental Bot',
      modified: 'Modified 3 weeks ago',
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="card rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">My Templates</h3>
      <div className="space-y-3">
        {myTemplates.map((template) => (
          <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 ${template.color} rounded-lg flex items-center justify-center`}>
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <div className="font-medium text-sm text-gray-900">{template.name}</div>
                <div className="text-xs text-gray-500">{template.modified}</div>
              </div>
            </div>
            <button 
              className="text-blue-600 hover:text-blue-800 text-sm"
              onClick={() => onEditTemplate(template.id)}
            >
              Edit
            </button>
          </div>
        ))}
      </div>
      
      <button 
        className="btn-secondary w-full mt-4 py-2 rounded-lg text-sm font-medium"
        onClick={onViewAllTemplates}
      >
        View All My Templates
      </button>
    </div>
  );
};

export default MyTemplates;

