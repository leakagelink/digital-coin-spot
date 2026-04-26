
import { Home, Eye, Briefcase, Wallet, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", path: "/", icon: Home },
  { label: "Watchlist", path: "/watchlist", icon: Eye },
  { label: "Portfolio", path: "/portfolio", icon: Briefcase },
  { label: "Wallet", path: "/wallet", icon: Wallet },
  { label: "Account", path: "/account", icon: User },
];

export function BottomNavigation() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 md:hidden">
      <div className="grid grid-cols-5 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center py-2 px-1 text-xs transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <Icon className="h-5 w-5 mb-1" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
