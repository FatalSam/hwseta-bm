import React from 'react';

interface ChartData {
    label: string;
    value: number;
    color?: string;
}

interface BarChartProps {
    data: ChartData[];
    title: string;
    showValues?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({ 
    data, 
    title, 
    showValues = true 
}) => {
    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
            <div className="space-y-3">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                        <div className="w-20 text-sm text-gray-600 truncate">
                            {item.label}
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-3 relative">
                            <div
                                className={`h-3 rounded-full transition-all duration-1000 ${
                                    item.color || 'bg-blue-500'
                                }`}
                                style={{
                                    width: `${(item.value / maxValue) * 100}%`
                                }}
                            />
                        </div>
                        {showValues && (
                            <div className="w-12 text-sm font-medium text-gray-900 text-right">
                                {item.value}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

interface LineChartProps {
    data: ChartData[];
    title: string;
    height?: number;
    showGrid?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({ 
    data, 
    title, 
    height = 200, 
    showGrid = true 
}) => {
    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue;
    
    const points = data.map((item, index) => ({
        x: (index / (data.length - 1)) * 100,
        y: range > 0 ? 100 - ((item.value - minValue) / range) * 100 : 50
    }));
    
    const pathData = points.map((point, index) => 
        `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
            <div className="relative" style={{ height }}>
                <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0"
                >
                    {showGrid && (
                        <>
                            {/* Horizontal grid lines */}
                            {[0, 25, 50, 75, 100].map(y => (
                                <line
                                    key={`h-${y}`}
                                    x1="0"
                                    y1={y}
                                    x2="100"
                                    y2={y}
                                    stroke="#e5e7eb"
                                    strokeWidth="0.5"
                                />
                            ))}
                            {/* Vertical grid lines */}
                            {[0, 25, 50, 75, 100].map(x => (
                                <line
                                    key={`v-${x}`}
                                    x1={x}
                                    y1="0"
                                    x2={x}
                                    y2="100"
                                    stroke="#e5e7eb"
                                    strokeWidth="0.5"
                                />
                            ))}
                        </>
                    )}
                    
                    {/* Line path */}
                    <path
                        d={pathData}
                        stroke="#3b82f6"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    
                    {/* Data points */}
                    {points.map((point, index) => (
                        <circle
                            key={index}
                            cx={point.x}
                            cy={point.y}
                            r="2"
                            fill="#3b82f6"
                        />
                    ))}
                </svg>
                
                {/* Labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500">
                    {data.map((item, index) => (
                        <span key={index} className="text-center">
                            {item.label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

interface DonutChartProps {
    data: ChartData[];
    title: string;
    size?: number;
    showLegend?: boolean;
}

export const DonutChart: React.FC<DonutChartProps> = ({ 
    data, 
    title, 
    size = 200, 
    showLegend = true 
}) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    
    let currentAngle = 0;
    const segments = data.map((item, index) => {
        const percentage = (item.value / total) * 100;
        const angle = (percentage / 100) * 360;
        const startAngle = currentAngle;
        currentAngle += angle;
        
        const x1 = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
        const y1 = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
        const x2 = 50 + 40 * Math.cos((currentAngle - 90) * Math.PI / 180);
        const y2 = 50 + 40 * Math.sin((currentAngle - 90) * Math.PI / 180);
        
        const largeArcFlag = angle > 180 ? 1 : 0;
        
        return {
            ...item,
            path: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
            color: colors[index % colors.length],
            percentage
        };
    });
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
            <div className="flex items-center justify-center">
                <div className="relative" style={{ width: size, height: size }}>
                    <svg
                        width={size}
                        height={size}
                        viewBox="0 0 100 100"
                        className="transform -rotate-90"
                    >
                        {segments.map((segment, index) => (
                            <path
                                key={index}
                                d={segment.path}
                                fill={segment.color}
                                stroke="white"
                                strokeWidth="2"
                            />
                        ))}
                        <circle
                            cx="50"
                            cy="50"
                            r="15"
                            fill="white"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">{total}</div>
                            <div className="text-sm text-gray-600">Total</div>
                        </div>
                    </div>
                </div>
            </div>
            
            {showLegend && (
                <div className="mt-4 space-y-2">
                    {segments.map((segment, index) => (
                        <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: segment.color }}
                                />
                                <span className="text-sm text-gray-700">{segment.label}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                                {segment.percentage.toFixed(1)}%
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}; 