
import React from 'react';
import { ProcessedCandle } from '@/services/binanceService';

interface BinanceChartCanvasProps {
  displayCandles: ProcessedCandle[];
  visibleCandles: number;
  minPrice: number;
  maxPrice: number;
  priceRange: number;
  padding: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onWheel: (e: React.WheelEvent) => void;
  zoomLevel: number;
  currentPrice?: number | null;
  priceChange?: number;
  isLiveConnected?: boolean;
}

export function BinanceChartCanvas({
  displayCandles,
  visibleCandles,
  minPrice,
  maxPrice,
  priceRange,
  padding,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onWheel,
  zoomLevel,
  currentPrice,
  priceChange = 0,
  isLiveConnected = false
}: BinanceChartCanvasProps) {
  
  return (
    <div
      className="w-full h-full cursor-grab active:cursor-grabbing select-none touch-none"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      <svg width="100%" height="100%" className="overflow-visible">
        <defs>
          <linearGradient id="bullishGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="bearishGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--danger))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--danger))" stopOpacity="0.9" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {displayCandles.map((candle, index) => {
          const x = (index / visibleCandles) * 100;
          const candleWidth = Math.max(0.8, (100 / visibleCandles) * 0.7);
          
          const openY = ((maxPrice + padding - candle.open) / (priceRange + 2 * padding)) * 100;
          const closeY = ((maxPrice + padding - candle.close) / (priceRange + 2 * padding)) * 100;  
          const highY = ((maxPrice + padding - candle.high) / (priceRange + 2 * padding)) * 100;
          const lowY = ((maxPrice + padding - candle.low) / (priceRange + 2 * padding)) * 100;
          
          const bodyTop = Math.min(openY, closeY);
          const bodyHeight = Math.max(Math.abs(openY - closeY), 0.5);
          const isCurrentCandle = index === displayCandles.length - 1;
          
          const momentumIntensity = Math.min(candle.momentum / 20, 1);
          const glowIntensity = isCurrentCandle ? 1 : momentumIntensity;
          
          return (
            <g key={`${candle.timestamp}-${index}`}>
              {/* High-Low Line (Wick) */}
              <line
                x1={`${x + candleWidth/2}%`}
                y1={`${highY}%`}
                x2={`${x + candleWidth/2}%`}
                y2={`${lowY}%`}
                stroke={candle.isBullish ? 'hsl(var(--success))' : 'hsl(var(--danger))'}
                strokeWidth={Math.max(0.3, candleWidth * 0.1)}
                opacity={0.8}
                filter={isCurrentCandle ? "url(#glow)" : undefined}
              />
              
              {/* Candle Body */}
              <rect
                x={`${x}%`}
                y={`${bodyTop}%`}
                width={`${candleWidth}%`}
                height={`${bodyHeight}%`}
                fill={candle.isBullish ? 'url(#bullishGradient)' : 'url(#bearishGradient)'}
                stroke={candle.isBullish ? 'hsl(var(--success))' : 'hsl(var(--danger))'}
                strokeWidth={0.2}
                opacity={isCurrentCandle ? 1 : 0.9}
                filter={glowIntensity > 0.5 ? "url(#glow)" : undefined}
                className={isCurrentCandle ? 'animate-pulse' : ''}
              />
              
              {/* Momentum Indicator */}
              {candle.momentum > 5 && (
                <rect
                  x={`${x}%`}
                  y="96%"
                  width={`${candleWidth}%`}
                  height={`${Math.min(candle.momentum / 15, 4)}%`}
                  fill={
                    candle.momentum > 50 ? 'hsl(var(--danger))' :
                    candle.momentum > 25 ? 'hsl(var(--warning))' : 'hsl(var(--success))'
                  }
                  opacity={0.7}
                  className={isCurrentCandle ? 'animate-pulse' : ''}
                />
              )}
              
              {/* Live Price Indicator */}
              {isCurrentCandle && (
                <>
                  <circle
                    cx={`${x + candleWidth/2}%`}
                    cy={`${closeY}%`}
                    r="3"
                    fill={candle.isBullish ? 'hsl(var(--success))' : 'hsl(var(--danger))'}
                    className="animate-ping"
                    opacity="0.8"
                  />
                  <circle
                    cx={`${x + candleWidth/2}%`}
                    cy={`${closeY}%`}
                    r="1.5"
                    fill={candle.isBullish ? 'hsl(var(--success))' : 'hsl(var(--danger))'}
                    className={isLiveConnected ? 'animate-pulse' : ''}
                  />
                  {/* Price change arrow */}
                  {Math.abs(priceChange) > 0.01 && (
                    <polygon
                      points={priceChange > 0 
                        ? `${x + candleWidth/2},${closeY - 3} ${x + candleWidth/2 - 2},${closeY - 1} ${x + candleWidth/2 + 2},${closeY - 1}`
                        : `${x + candleWidth/2},${closeY + 3} ${x + candleWidth/2 - 2},${closeY + 1} ${x + candleWidth/2 + 2},${closeY + 1}`
                      }
                      fill={priceChange > 0 ? 'hsl(var(--success))' : 'hsl(var(--danger))'}
                      className="animate-bounce"
                    />
                  )}
                </>
              )}
            </g>
          );
        })}
      </svg>
      
      {/* Live price line */}
      {currentPrice && displayCandles.length > 0 && (
        <line
          x1="0%"
          y1={`${((maxPrice + padding - currentPrice) / (priceRange + 2 * padding)) * 100}%`}
          x2="100%"
          y2={`${((maxPrice + padding - currentPrice) / (priceRange + 2 * padding)) * 100}%`}
          stroke={priceChange >= 0 ? 'hsl(var(--success))' : 'hsl(var(--danger))'}
          strokeWidth="1"
          strokeDasharray="4,4"
          opacity="0.8"
          className={isLiveConnected ? 'animate-pulse' : ''}
        />
      )}

      {/* Chart Info Overlay */}
      <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-sm rounded-md p-1.5 text-white text-xs">
        <div className="flex items-center gap-2">
          <span>Zoom: {zoomLevel.toFixed(1)}x</span>
          <span>•</span>
          <span>{displayCandles.length} candles</span>
          {isLiveConnected && (
            <>
              <span>•</span>
              <span className="text-green-400 animate-pulse">● LIVE</span>
            </>
          )}
        </div>
      </div>

      {/* Live Price Display */}
      {currentPrice && (
        <div className="absolute top-1 right-1 bg-black/70 backdrop-blur-sm rounded-md p-1.5 text-white text-xs">
          <div className="flex items-center gap-2">
            <span>Price: ${currentPrice.toFixed(2)}</span>
            {Math.abs(priceChange) > 0.01 && (
              <span className={`font-bold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
