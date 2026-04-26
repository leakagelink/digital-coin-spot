
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NavLink } from "react-router-dom";

interface NavigationItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

interface NavigationProps {
  items: NavigationItem[];
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Navigation({ items, orientation = "horizontal", className }: NavigationProps) {
  return (
    <nav className={cn(
      "flex gap-2",
      orientation === "vertical" ? "flex-col" : "flex-row",
      className
    )}>
      {items.map((item) => (
        <Button
          key={item.path}
          variant="ghost"
          size="sm"
          asChild
          className="hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <NavLink
            to={item.path}
            className={({ isActive }) => 
              cn(
                "flex items-center gap-2",
                isActive && "bg-primary/20 text-primary"
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        </Button>
      ))}
    </nav>
  );
}
