import React from 'react';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color: 'blue' | 'purple' | 'amber' | 'emerald';
}

const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    emerald: 'from-emerald-500 to-emerald-600',
};

export default function StatsCard({ title, value, icon, trend, color }: StatsCardProps) {
    return (
        <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
            <div className="flex items-center justify-between mb-4">
                <div className="text-white/80 text-sm font-medium">{title}</div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    {icon}
                </div>
            </div>
            <div className="flex items-end justify-between">
                <div className="text-3xl font-bold">{value}</div>
                {trend && (
                    <div className={`flex items-center gap-1 text-sm ${trend.isPositive ? 'text-emerald-200' : 'text-red-200'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trend.isPositive ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
                        </svg>
                        <span>{Math.abs(trend.value)}%</span>
                    </div>
                )}
            </div>
        </div>
    );
}
