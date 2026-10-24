import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import { LayersIcon, MenuIcon, UsersIcon, UserRoundCogIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

type NavItem = {
  to: string;
  label: string;
  icon: typeof UsersIcon;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Qarzdorlar", icon: UsersIcon },
  { to: "/groups", label: "Guruhlar", icon: LayersIcon },
  { to: "/students", label: "Oʻquvchilar", icon: UserRoundCogIcon },
];

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  const desktopNav = NAV_ITEMS.map(({ to, label, icon: Icon }) => (
    <NavLink
      key={to}
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
          isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )
      }
    >
      <Icon className="size-4 shrink-0" />
      <span>{label}</span>
    </NavLink>
  ));

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r p-4 sm:flex">
        <NavLink to="/" className="px-2 text-lg font-semibold tracking-tight">
          Toʻlovlar nazorati
        </NavLink>
        <nav className="mt-4 flex flex-col gap-1">{desktopNav}</nav>
        <ThemeToggle className="mt-auto self-start" />
      </aside>

      {/* Mobile: top bar with menu button */}
      <div className="w-full min-w-0 sm:px-6">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background px-4 sm:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Menyuni ochish"
                  className="size-11"
                >
                  <MenuIcon />
                </Button>
              }
            />
            <SheetContent
              side="left"
              className="flex w-64 flex-col gap-4 p-4"
            >
              <SheetHeader className="border-b pb-4">
                <SheetTitle>
                  <NavLink to="/" onClick={() => setMenuOpen(false)}>
                    Toʻlovlar nazorati
                  </NavLink>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                  <SheetClose
                    key={to}
                    render={
                      <NavLink
                        to={to}
                        end={to === "/"}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "flex h-11 items-center gap-2 rounded-md px-3 text-base font-medium transition-colors",
                            isActive
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )
                        }
                      >
                        <Icon className="size-5 shrink-0" />
                        <span>{label}</span>
                      </NavLink>
                    }
                  />
                ))}
              </nav>
              <div className="mt-auto flex items-center gap-2 px-2 pt-4">
                <ThemeToggle />
                <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <XIcon className="size-3" />
                  <SheetClose>Menyuni yopish</SheetClose>
                </span>
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="text-base font-semibold tracking-tight">
            Toʻlovlar nazorati
          </h1>
        </header>
        <main className="px-4 py-4 sm:py-6">
          <Outlet />
        </main>
      </div>

      <Toaster position="top-center" />
    </div>
  );
}
