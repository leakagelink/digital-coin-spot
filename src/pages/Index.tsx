
import { Layout } from "@/components/layout/layout";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { MarketOverview } from "@/components/dashboard/market-overview";
import { LiveMomentum } from "@/components/dashboard/live-momentum";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const Index = () => {
  const isMobile = useIsMobile();
  
  return (
    <Layout>
      <div className={cn(
        "space-y-3 animate-slide-up",
        isMobile ? "space-y-2" : "space-y-4 md:space-y-6"
      )}>
        <div className={cn(
          "grid gap-3",
          isMobile 
            ? "grid-cols-1" 
            : "grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6"
        )}>
          {/* Portfolio Summary */}
          <div className={cn(
            isMobile ? "order-2" : "xl:col-span-2 order-2 xl:order-1"
          )}>
            <PortfolioSummary />
          </div>
          
          {/* Live Momentum */}
          <div className={cn(
            isMobile ? "order-1" : "xl:col-span-1 order-1 xl:order-2"
          )}>
            <LiveMomentum />
          </div>
        </div>
        
        {/* Market Overview */}
        <div className="order-3">
          <MarketOverview />
        </div>
      </div>
    </Layout>
  );
};

export default Index;
