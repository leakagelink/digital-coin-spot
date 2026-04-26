
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  Menu,
  TrendingUp, 
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { ProcessedCandle } from '@/services/binanceService';
import { useIsMobile } from '@/hooks/use-mobile';

interface BinanceChartControlsProps {
  symbol: string;
  name: string;
  latestCandle?: ProcessedCandle;
  interval: string;
  isAutoRefresh: boolean;
  showIntervalMenu: boolean;
  intervals: Array<{ value: string; label: string }>;
  quickIntervals: string[];
  onIntervalChange: (interval: string) => void;
  onToggleIntervalMenu: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRefresh: () => void;
  onClose?: () => void;
}

export function BinanceChartControls({
  symbol,
  name,
  latestCandle,
  interval,
  isAutoRefresh,
  showIntervalMenu,
  intervals,
  quickIntervals,
  onIntervalChange,
  onToggleIntervalMenu,
  onZoomIn,
  onZoomOut,
  onRefresh,
  onClose
}: BinanceChartControlsProps) {
  const isMobile = useIsMobile();
  
  const isLatestBullish = latestCandle?.isBullish;
  
  return (
    <div className="flex items-center justify-between gap-1 px-2 py-1.5 bg-gradient-to-r from-gray-900 to-black text-white border-b border-gray-700">
      {/* Left side - Symbol and Price Info */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <h3 className="text-xs font-bold truncate max-w-20">{name}</h3>
        <Badge variant="outline" className="text-xs bg-blue-900 text-blue-100 border-blue-700 px-1 py-0 h-4">
          {symbol}
        </Badge>
        {latestCandle && (
          <div className="hidden sm:flex items-center gap-1">
            {isLatestBullish ? (
              <TrendingUp className="h-3 w-3 text-success" />
            ) : (
              <TrendingDown className="h-3 w-3 text-danger" />
            )}
            <span className={`text-xs font-mono ${isLatestBullish ? 'text-success' : 'text-danger'}`}>
              ₹{(latestCandle.close * 84).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>
      
      {/* Center - Controls */}
      <div className="flex items-center gap-1">
        {/* Interval Controls */}
        {isMobile ? (
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs hover:bg-gray-800"
              onClick={onToggleIntervalMenu}
            >
              <Menu className="h-3 w-3 mr-1" />
              {interval}
            </Button>
            {showIntervalMenu && (
              <div className="absolute top-7 right-0 bg-black/95 border border-gray-700 rounded-md p-2 grid grid-cols-3 gap-1 z-50 min-w-32 backdrop-blur-sm">
                {intervals.map((int) => (
                  <Button
                    key={int.value}
                    size="sm"
                    variant={interval === int.value ? "default" : "ghost"}
                    className="h-6 px-2 text-xs hover:bg-gray-700"
                    onClick={() => {
                      onIntervalChange(int.value);
                      onToggleIntervalMenu();
                    }}
                  >
                    {int.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-1 max-w-md overflow-x-auto">
            {quickIntervals.map((int) => (
              <Button
                key={int}
                size="sm"
                variant={interval === int ? "default" : "ghost"}
                className="h-6 px-2 text-xs whitespace-nowrap hover:bg-gray-800"
                onClick={() => onIntervalChange(int)}
              >
                {int}
              </Button>
            ))}
          </div>
        )}
        
        {/* Zoom Controls */}
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-6 px-1 hover:bg-gray-800" 
            onClick={onZoomOut}
            title="Zoom Out"
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-6 px-1 hover:bg-gray-800" 
            onClick={onZoomIn}
            title="Zoom In"
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Refresh Button */}
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-6 px-1 hover:bg-gray-800" 
          onClick={onRefresh}
          title="Refresh"
        >
          <RefreshCw className={`h-3 w-3 ${isAutoRefresh ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {/* Right side - Status and Close */}
      <div className="flex items-center gap-2">
        {/* Live Status */}
        <div className="flex items-center gap-1">
          <div className={`h-1.5 w-1.5 rounded-full ${isAutoRefresh ? 'bg-success animate-pulse' : 'bg-warning'}`}></div>
          <span className="text-xs hidden sm:inline">{isAutoRefresh ? 'LIVE' : 'PAUSE'}</span>
        </div>
        
        {/* Close Button */}
        {onClose && (
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-6 px-1 hover:bg-gray-800" 
            onClick={onClose}
            title="Close"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
