import { useMemo, useRef, useState, useEffect } from "react";
import { PriceData } from "./usePriceData";

export type Position = {
  id: string;
  symbol: string;
  coin_name: string;
  amount: number;
  buy_price: number;
  current_price: number;
  total_investment: number;
  current_value: number;
  pnl: number;
  pnl_percentage: number;
  admin_adjustment_pct?: number;
  admin_price_override?: boolean;
  position_type?: string;
  status?: string;
  created_at?: string;
};

// Store simulated momentum data outside component to persist across renders
const simulatedMomentumStore: Record<string, { 
  offset: number; 
  direction: number; 
  lastUpdate: number;
  baseAdminPct: number;
}> = {};

/**
 * Calculates live P&L for positions without modifying database
 * For admin-adjusted positions: disconnects from live market and uses admin_adjustment_pct as the P&L %
 * with simulated momentum (±5%) around that value
 */
export function usePositionCalculations(
  positions: Position[] | undefined,
  livePrices: Record<string, PriceData>
) {
  // Force re-render every 2 seconds for momentum animation
  const [tick, setTick] = useState(0);
  
  // Check if there are any admin-adjusted positions
  const hasAdminAdjusted = positions?.some(p => p.admin_price_override === true) || false;
  
  useEffect(() => {
    if (!hasAdminAdjusted) return;
    
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 2000); // Update every 2 seconds
    
    return () => clearInterval(interval);
  }, [hasAdminAdjusted]);

  return useMemo(() => {
    if (!positions) return [];

    const now = Date.now();

    return positions.map(position => {
      // Ensure we have valid numeric values (handle null/undefined from DB)
      const totalInvestment = Number(position.total_investment) || 0;
      const amount = Number(position.amount) || 0;
      const buyPrice = Number(position.buy_price) || 0;
      const currentPrice = Number(position.current_price) || buyPrice;
      
      // If total_investment is 0, calculate it from amount * buy_price
      const effectiveInvestment = totalInvestment > 0 ? totalInvestment : (amount * buyPrice);
      
      // Check if this position has admin override
      const hasAdminOverride = position.admin_price_override === true;
      const adminPct = Number(position.admin_adjustment_pct) || 0;

      let displayPnlPercentage: number;
      let simulatedMomentum = 0;
      let simulatedDirection = 1;

      if (hasAdminOverride) {
        // For admin-adjusted positions: P&L is ENTIRELY controlled by admin_adjustment_pct
        // Plus simulated momentum of ±5% around that value in the direction admin set
        const positionId = position.id;
        
        // Initialize or reset if admin changed the adjustment
        if (!simulatedMomentumStore[positionId] || 
            simulatedMomentumStore[positionId].baseAdminPct !== adminPct) {
          // Direction based on admin adjustment sign
          const dir = adminPct >= 0 ? 1 : -1;
          simulatedMomentumStore[positionId] = {
            offset: (Math.random() * 2.5) * dir, // 0 to 2.5% in admin direction
            direction: dir,
            lastUpdate: now,
            baseAdminPct: adminPct
          };
        }

        const simData = simulatedMomentumStore[positionId];
        
        // Update momentum with random walk, staying within ±5% of admin value
        // Biased towards admin direction
        if (now - simData.lastUpdate > 1500) {
          const dir = adminPct >= 0 ? 1 : -1;
          
          // Random change biased in admin direction
          const biasedRandom = Math.random() * 0.6 + 0.2; // 0.2 to 0.8
          const change = (biasedRandom - 0.4) * 1.2 * dir;
          
          // Keep offset within ±5% range, biased in admin direction
          let newOffset = simData.offset + change;
          if (dir > 0) {
            // Positive direction: keep between -2% and +5%
            newOffset = Math.max(-2, Math.min(5, newOffset));
          } else {
            // Negative direction: keep between -5% and +2%
            newOffset = Math.max(-5, Math.min(2, newOffset));
          }
          
          simData.offset = newOffset;
          simData.lastUpdate = now;
        }

        // P&L % = admin set value + simulated momentum offset
        displayPnlPercentage = adminPct + simData.offset;
        
        // Calculate momentum value for display (how much it's moving)
        simulatedMomentum = Math.abs(simData.offset) + Math.random() * 0.5;
        simulatedDirection = displayPnlPercentage >= 0 ? 1 : -1;
      } else {
        // For normal positions: use live market price
        const livePrice = livePrices[position.symbol]?.priceINR || currentPrice;
        const currentValue = amount * livePrice;
        const pnl = currentValue - effectiveInvestment;
        displayPnlPercentage = effectiveInvestment > 0 
          ? (pnl / effectiveInvestment) * 100 
          : 0;
      }

      // Calculate display values based on P&L percentage
      const displayPnl = (displayPnlPercentage / 100) * effectiveInvestment;
      const displayCurrentValue = effectiveInvestment + displayPnl;
      const displayCurrentPrice = amount > 0 
        ? displayCurrentValue / amount 
        : buyPrice;

      return {
        ...position,
        current_price: displayCurrentPrice,
        current_value: displayCurrentValue,
        pnl: displayPnl,
        pnl_percentage: displayPnlPercentage,
        // Add simulated momentum data for admin-adjusted positions
        _isAdminAdjusted: hasAdminOverride,
        _simulatedMomentum: simulatedMomentum,
        _simulatedDirection: simulatedDirection,
      };
    });
  }, [positions, livePrices, tick]); // tick triggers re-render for momentum
}
