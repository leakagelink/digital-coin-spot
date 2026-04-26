
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PriceDisplayProps {
  price?: number;
  change?: number;
  changePercent?: number;
  symbol?: string;
  amount?: number;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
  showDualCurrency?: boolean;
  usdtPrice?: number;
}

export function PriceDisplay({ 
  price, 
  change = 0, 
  changePercent = 0, 
  symbol = "USD",
  amount,
  size = "md",
  showIcon = true,
  className,
  showDualCurrency = false,
  usdtPrice
}: PriceDisplayProps) {
  // Use amount if provided, otherwise use price
  const displayPrice = amount ?? price ?? 0;
  const isPositive = change >= 0;
  const showChangeData = change !== 0 && price !== undefined;
  
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl font-semibold"
  };

  // Convert USDT to INR (approximate rate: 1 USDT = 84 INR)
  const usdToInrRate = 84;
  const inrPrice = showDualCurrency && usdtPrice ? usdtPrice * usdToInrRate : displayPrice * usdToInrRate;
  
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className={cn("font-mono", sizeClasses[size])}>
        {showDualCurrency ? (
          <div className="flex flex-col">
            <span>${displayPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
            <span className="text-sm text-muted-foreground">
              ₹{inrPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>
        ) : (
          <>
            {symbol === 'USD' || symbol === 'USDT' ? '$' : '₹'}
            {displayPrice.toLocaleString(symbol === 'USD' || symbol === 'USDT' ? 'en-US' : 'en-IN', { maximumFractionDigits: 2 })}
          </>
        )}
      </div>
      {showChangeData && (
        <div className={cn(
          "flex items-center gap-1 text-sm",
          isPositive ? "text-success" : "text-danger"
        )}>
          {showIcon && (
            isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
          )}
          <span>
            {isPositive ? "+" : ""}
            {symbol === 'USD' || symbol === 'USDT' ? '$' : '₹'}
            {Math.abs(change).toLocaleString(symbol === 'USD' || symbol === 'USDT' ? 'en-US' : 'en-IN', { maximumFractionDigits: 2 })}
          </span>
          <span>
            ({isPositive ? "+" : ""}{changePercent.toFixed(2)}%)
          </span>
        </div>
      )}
    </div>
  );
}
