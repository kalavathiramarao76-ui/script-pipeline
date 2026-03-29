'use client';

interface TabsProps {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}

export default function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex border-b border-gray-800 mb-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            active === tab.id
              ? 'text-white'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
              active === tab.id ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'
            }`}>
              {tab.count}
            </span>
          )}
          {active === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
      ))}
    </div>
  );
}
