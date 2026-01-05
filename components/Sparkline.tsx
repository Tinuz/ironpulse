import React from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  fillOpacity?: number;
}

export default function Sparkline({ 
  data, 
  width = 80, 
  height = 24, 
  color = '#f59e0b',
  strokeWidth = 2,
  fillOpacity = 0.1
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <div 
        style={{ width, height }} 
        className="flex items-center justify-center text-xs text-muted-foreground"
      >
        —
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Generate SVG path
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  // Determine trend
  const first = data[0];
  const last = data[data.length - 1];
  const isPositive = last >= first;

  return (
    <svg 
      width={width} 
      height={height} 
      className="overflow-visible"
      style={{ display: 'block' }}
    >
      {/* Fill area */}
      <path
        d={areaPath}
        fill={color}
        opacity={fillOpacity}
      />
      
      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Last point dot */}
      <circle
        cx={width}
        cy={height - ((last - min) / range) * height}
        r={strokeWidth + 1}
        fill={color}
        className={isPositive ? 'animate-pulse' : ''}
      />
    </svg>
  );
}
