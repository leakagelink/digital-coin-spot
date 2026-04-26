
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BinanceChart } from '@/components/charts/BinanceChart';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export default function Chart() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [cryptoName, setCryptoName] = useState('');
  const [isValidSymbol, setIsValidSymbol] = useState(true);
  const isMobile = useIsMobile();

  const cryptoMapping: { [key: string]: string } = {
    'BTCUSDT': 'Bitcoin', 'ETHUSDT': 'Ethereum', 'BNBUSDT': 'BNB',
    'ADAUSDT': 'Cardano', 'SOLUSDT': 'Solana', 'USDTUSDT': 'Tether',
    'XRPUSDT': 'Ripple', 'DOTUSDT': 'Polkadot', 'LINKUSDT': 'Chainlink',
    'LTCUSDT': 'Litecoin'
  };

  useEffect(() => {
    if (symbol) {
      if (!symbol.match(/^[A-Z]+USDT$/)) {
        setIsValidSymbol(false);
        return;
      }
      setCryptoName(cryptoMapping[symbol] || symbol.replace('USDT', ''));
      setIsValidSymbol(true);
    }
  }, [symbol]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  if (!symbol) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <div className="text-center text-foreground max-w-sm">
          <AlertCircle className="mx-auto mb-3 text-danger h-8 w-8" />
          <h1 className="text-lg font-bold mb-2">Symbol Not Found</h1>
          <p className="text-muted-foreground mb-3 text-sm">The requested trading symbol was not provided.</p>
          <Button onClick={() => navigate('/')} className="text-xs px-3 py-2" size="sm">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!isValidSymbol) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <div className="text-center text-foreground max-w-sm">
          <AlertCircle className="mx-auto mb-3 text-warning h-8 w-8" />
          <h1 className="text-lg font-bold mb-2">Invalid Symbol</h1>
          <p className="text-muted-foreground mb-2 text-sm">The symbol "{symbol}" is not a valid trading pair.</p>
          <p className="text-muted-foreground mb-3 text-xs">Please use format like BTCUSDT, ETHUSDT, etc.</p>
          <div className="flex flex-col gap-2">
            <Button onClick={handleBack} variant="outline" size="sm" className="flex items-center gap-1 text-xs">
              <ArrowLeft className="h-3 w-3" />
              Go Back
            </Button>
            <Button onClick={() => navigate('/')} className="text-xs" size="sm">
              Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted overflow-x-hidden">
      {/* Responsive Header */}
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className={cn(
          "mx-auto px-2 py-2",
          isMobile ? "container" : "container px-4"
        )}>
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={handleBack}
              className="text-foreground hover:bg-muted flex items-center gap-1 text-xs px-2 py-1 h-8"
              size="sm"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </Button>
            
            <div className="text-center flex-1 mx-2">
              <h1 className="text-sm font-bold text-foreground truncate">{cryptoName}</h1>
              <p className="text-xs text-muted-foreground">Live Chart</p>
            </div>
            
            <div className="w-12"></div>
          </div>
        </div>
      </div>
      
      {/* Responsive Chart Container */}
      <div className={cn(
        "mx-auto",
        isMobile ? "px-1 py-1" : "px-2 py-2 container"
      )}>
        <BinanceChart
          symbol={symbol}
          name={cryptoName}
          onClose={handleBack}
          isFullPage={true}
        />
      </div>
    </div>
  );
}
