
import { Button } from "@/components/ui/button";
import { Menu, Bell } from "lucide-react";
import { Navigation } from "@/components/ui/navigation";
import { UserMenu } from "@/components/layout/user-menu";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { label: "Dashboard", path: "/" },
  { label: "Watchlist", path: "/watchlist" },
  { label: "Portfolio", path: "/portfolio" },
  { label: "Wallet", path: "/wallet" },
  { label: "My Account", path: "/account" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="glass border-b border-border/50 sticky top-0 z-50">
      <div className="container flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <img 
              src="/lovable-uploads/b0ad78d4-aa9f-4535-a7ec-d2f52a914912.png" 
              alt="Bitexa" 
              className="w-8 h-8"
            />
            <h1 className="text-xl font-bold gradient-text">Bitexa</h1>
          </div>
          
          <div className="hidden md:block">
            <Navigation items={navItems} />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="hover:bg-primary/10">
            <Bell className="h-5 w-5" />
          </Button>
          
          <div className="hidden md:block">
            <UserMenu />
          </div>
          
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden hover:bg-primary/10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="flex flex-col gap-4 pt-6">
                <Navigation items={navItems} orientation="vertical" />
                <div className="pt-4 border-t">
                  <UserMenu />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
