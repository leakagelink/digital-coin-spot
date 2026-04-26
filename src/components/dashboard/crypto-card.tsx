
import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, BarChart3, Star, StarOff } from "lucide-react";
import { PriceDisplay } from "@/components/ui/price-display";

interface CryptoCardProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  isWatchlisted?: boolean;
  onToggleWatchlist?: () => void;
  onChartClick?: () => void;
  momentum?: number;
  minimumAmount?: number;
}

export function CryptoCard({ 
  symbol, 
  name, 
  price, 
  change, 
  changePercent, 
  isWatchlisted = false,
  onToggleWatchlist,
  onChartClick,
  momentum,
  minimumAmount
}: CryptoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isPositive = changePercent >= 0;

  return (
    <Card 
      className="glass hover-glow cursor-pointer transition-all duration-300 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onChartClick}
    >
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg gradient-text">{symbol}</h3>
              {momentum !== undefined && (
                <Badge 
                  variant="outline" 
                  className={`text-xs font-medium px-2 py-1 animate-pulse ${
                    momentum > 15 ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                    momentum > 8 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' :
                    'bg-green-500/15 text-green-400 border-green-500/30'
                  }`}
                >
                  🔥 {momentum.toFixed(1)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{name}</p>
          </div>
          
          {onToggleWatchlist && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatchlist();
              }}
              className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
            >
              {isWatchlisted ? (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ) : (
                <StarOff className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Price */}
        <div className="space-y-2">
          <PriceDisplay 
            price={price}
            change={change}
            changePercent={changePercent}
            size="lg"
            showDualCurrency
            usdtPrice={price}
          />
        </div>

        {/* Trend indicator */}
        <div className={`flex items-center gap-2 text-sm font-medium ${
          isPositive ? 'text-success' : 'text-danger'
        }`}>
          {isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span>
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}% (24h)
          </span>
        </div>

        {/* Minimum Amount */}
        {minimumAmount && (
          <div className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
            Min: ${minimumAmount} USDT
          </div>
        )}

        {/* Chart button */}
        <Button
          size="sm"
          variant="outline"
          className={`w-full transition-all duration-300 ${
            isHovered ? 'bg-primary/10 border-primary/30' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onChartClick?.();
          }}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          View Chart
        </Button>
      </CardContent>
    </Card>
  );
}
