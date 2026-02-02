import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: 'teal' | 'default';
    subtitle?: string;
}

export default function StatsCard({ title, value, icon, trend, color = 'default', subtitle }: StatsCardProps) {
    return (
        <div className="card p-5 transition-all duration-200 hover:shadow-card-hover">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <p className="text-xs font-medium text-grey-600 uppercase tracking-wider mb-1">
                        {title}
                    </p>
                    {subtitle && (
                        <p className="text-xs text-grey-600">{subtitle}</p>
                    )}
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    color === 'teal' ? 'bg-alethea-50 text-alethea-600' : 'bg-grey-50 text-grey-700'
                }`}>
                    {icon}
                </div>
            </div>

            {/* Value */}
            <div className="flex items-end justify-between">
                <div className="text-2xl font-bold text-black tracking-tight">
                    {value}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-sm font-medium ${
                        trend.isPositive ? 'text-success' : 'text-error'
                    }`}>
                        {trend.isPositive ? (
                            <TrendingUp className="w-4 h-4" />
                        ) : (
                            <TrendingDown className="w-4 h-4" />
                        )}
                        <span>{Math.abs(trend.value)}%</span>
                    </div>
                )}
            </div>
        </div>
    );
}
