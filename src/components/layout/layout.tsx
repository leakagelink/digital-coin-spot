
import { Header } from "./header";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function Layout({ children, className }: LayoutProps) {
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main className={cn(
        "container mx-auto",
        isMobile 
          ? "px-2 py-2 pb-20" // Mobile: minimal padding, space for bottom nav
          : "px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8", // Desktop: progressive padding
        className
      )}>
        {children}
      </main>
      {isMobile && <BottomNavigation />}
    </div>
  );
}
