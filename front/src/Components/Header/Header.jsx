import React, { useEffect, useState } from "react";
import { Menu, Phone, LogIn, LogOut } from "lucide-react";
import { Link } from "../common/Link";
import { WvcLogo } from "../common/WcvLogo";
import { useNavigate } from 'react-router-dom';
import {
  MenuProvider,
  useMenu,
} from "../common/WordPressMenuProvider";
import { Button } from "../common/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "../common/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "../common/sheet";
import { cn } from "../common/utils";
import { useAuth } from '../../context/AuthContext';

// Recursive submenu component for desktop navigation
function DesktopNavSubmenu({ items }) {
  return (
    <ul className="grid min-w-[200px] gap-1 p-2 bg-popover rounded-xl border border-border shadow-md">
      {items.map((subItem, index) => (
        <li key={subItem.id || `sub-${index}`} data-index={index}>
          <NavigationMenuLink asChild>
            <Link
              to={subItem.href || "#"}
              className="block select-none rounded-lg px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-primary focus:bg-muted focus:text-primary outline-none"
            >
              {subItem.label}
            </Link>
          </NavigationMenuLink>
          {subItem.children && subItem.children.length > 0 && (
            <div className="pl-3 mt-1 border-l border-border/70">
              <DesktopNavSubmenu items={subItem.children} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

// Leaf consumer for desktop navigation menu
function DesktopMenuConsumer() {
  const { menuItems, loading } = useMenu();
  const { isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center gap-2" aria-hidden="true">
        <div className="h-9 w-20 bg-muted/60 animate-pulse rounded-full" />
        <div className="h-9 w-24 bg-muted/60 animate-pulse rounded-full" />
        <div className="h-9 w-20 bg-muted/60 animate-pulse rounded-full" />
        <div className="h-9 w-20 bg-muted/60 animate-pulse rounded-full" />
      </div>
    );
  }

  const defaultItems = !isAuthenticated
  ? [
      { id: "home", label: "Главная", href: "/" },
      { id: "announcements", label: "Объявления", href: "/AnnouncementsPage" },
    ]
  : [
      { id: "home", label: "Главная", href: "/" },
      { id: "announcements", label: "Объявления", href: "/AnnouncementsPage" },
      { id: "news", label: "Новости", href: "/NewsPage" },
    ];

  const items = menuItems && menuItems.length > 0 ? menuItems : defaultItems;

  return (
    <NavigationMenu viewport={false} className="hidden lg:flex">
      <NavigationMenuList className="gap-1.5">
        {items.map((item, i) => (
          <NavigationMenuItem key={item.id || `menu-${i}`} data-index={i}>
            {item.children && item.children.length > 0 ? (
              <>
                <NavigationMenuTrigger className="rounded-full px-4 text-sm font-semibold text-foreground bg-transparent hover:bg-muted/70 hover:text-primary data-[state=open]:bg-muted/80 data-[state=open]:text-primary transition-colors">
                  {item.label}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <DesktopNavSubmenu items={item.children} />
                </NavigationMenuContent>
              </>
            ) : (
              <NavigationMenuLink asChild>
                <Link
                  to={item.href || "#"}
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "rounded-full px-4 text-sm font-semibold text-foreground bg-transparent hover:bg-muted/70 hover:text-primary focus:bg-muted/70 focus:text-primary transition-colors"
                  )}
                >
                  {item.label}
                </Link>
              </NavigationMenuLink>
            )}
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

// Recursive list for mobile drawer navigation
function MobileNavList({ items, onItemClick }) {
  return (
    <ul className="flex flex-col gap-1.5 w-full">
      {items.map((item, i) => (
        <li key={item.id || `mob-${i}`} data-index={i} className="w-full">
          <Link
            to={item.href || "#"}
            onClick={onItemClick}
            className="flex items-center justify-between rounded-xl px-4 py-3 text-base font-semibold text-foreground hover:bg-muted/80 hover:text-primary transition-colors active:scale-[0.99]"
          >
            <span>{item.label}</span>
          </Link>
          {item.children && item.children.length > 0 && (
            <div className="pl-4 my-1 border-l-2 border-border/80">
              <MobileNavList items={item.children} onItemClick={onItemClick} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

// Leaf consumer for mobile drawer navigation
function MobileMenuConsumer({ onClose }) {
  const { menuItems, loading } = useMenu();
  const { isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-4" aria-hidden="true">
        <div className="h-10 w-full bg-muted/60 animate-pulse rounded-xl" />
        <div className="h-10 w-full bg-muted/60 animate-pulse rounded-xl" />
        <div className="h-10 w-full bg-muted/60 animate-pulse rounded-xl" />
        <div className="h-10 w-full bg-muted/60 animate-pulse rounded-xl" />
      </div>
    );
  }

  const defaultItems = isAuthenticated
  ? [
      { id: "mob-home", label: "Главная", href: "/" },
      { id: "mob-announcements", label: "Объявления", href: "/AnnouncementsPage" },
    ]
  : [
      { id: "mob-home", label: "Главная", href: "/" },
      { id: "mob-announcements", label: "Объявления", href: "/AnnouncementsPage" },
      { id: "mob-schedule", label: "Новости", href: "/NewsPage" }
    ];

  const items = menuItems && menuItems.length > 0 ? menuItems : defaultItems;

  return (
    <nav className="flex flex-col w-full" aria-label="Мобильная навигация">
      <MobileNavList items={items} onItemClick={onClose} />
    </nav>
  );
}

const Header = () => {
  const { isAuthenticated, logout } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleAuthClick = () => {
    if (isAuthenticated) {
      logout();
      navigate('/');
    }
  };
  // Smooth scroll handler for same-page and anchor links
  useEffect(() => {
    const handleAnchorClick = (e) => {
      const target = e.target;
      const anchor = target.closest("a[href]");

      if (anchor) {
        const href = anchor.getAttribute("href");
        if (!href) return;

        if (href === "/#") {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }

        let hash = "";
        if (href.startsWith("#")) {
          hash = href;
        } else if (href.startsWith("/") && href.includes("#")) {
          const [path, hashPart] = href.split("#");
          if (hashPart === "") {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }
          if (path === "/" || path === window.location.pathname) {
            hash = "#" + hashPart;
          }
        }

        if (hash && hash !== "#") {
          const element = document.querySelector(hash);
          if (element) {
            e.preventDefault();
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, []);

  return (
    <section
      id="шапка"
      data-nav="light"
      className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md border-b border-border shadow-2xs transition-[background-color,border-color] duration-200"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="flex h-20 items-center justify-between gap-4">
          {/* Studio Brand Logo */}
          <div className="flex items-center shrink-0">
            <Link
              to="/"
              className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1 transition-opacity hover:opacity-90"
              aria-label="Изостудия Белоцерковской — На главную"
            >
              <WvcLogo className="h-9 sm:h-10 w-auto" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center justify-center flex-1 px-4">
            <MenuProvider menu_id="19">
              <DesktopMenuConsumer />
            </MenuProvider>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            <Link
              to="tel:+79160066021"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Позвонить"
            >
              <Phone className="size-3.5 text-primary" />
              <span>+7 (916) 006-60-21</span>
            </Link>

            {!isAuthenticated ? (
                <Button
                    className="rounded-full bg-primary text-primary-foreground font-semibold px-5 sm:px-6 h-10 sm:h-11 shadow-sm hover:bg-primary/90 transition-[background-color,box-shadow]"
                >
                    <Link to="/login" className="flex items-center">
                        <LogIn className="size-4 mr-1.5" />
                        <span>Войти</span>
                    </Link>
                </Button>
            ) : (
                <Button
                    onClick={handleAuthClick}
                    className="rounded-full bg-primary text-primary-foreground font-semibold px-5 sm:px-6 h-10 sm:h-11 shadow-sm hover:bg-primary/90 transition-[background-color,box-shadow]"
                >
                    <LogOut className="size-4 mr-1.5" />
                    <span>Выйти</span>
                </Button>
            )}
            {/* Mobile Navigation Drawer Trigger */}
            <div className="flex lg:hidden">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full size-10 border-border bg-card text-foreground hover:bg-muted hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Открыть меню навигации"
                  >
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[85vw] sm:max-w-md bg-background p-6 border-l border-border flex flex-col justify-between overflow-y-auto"
                >
                  <div className="flex flex-col gap-6">
                    <SheetHeader className="p-0 text-left border-b border-border pb-4">
                      <div className="flex items-center justify-between">
                        <Link
                          to="/"
                          onClick={() => setSheetOpen(false)}
                          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1"
                        >
                          <WvcLogo className="h-8 w-auto" />
                        </Link>
                      </div>
                      <SheetTitle className="sr-only">
                        Меню навигации
                      </SheetTitle>
                    </SheetHeader>

                    <div className="py-2">
                      <MenuProvider menu_id="19">
                        <MobileMenuConsumer
                          onClose={() => setSheetOpen(false)}
                        />
                      </MenuProvider>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pt-6 border-t border-border">

                    <a
                      href="tel:+79160066021"
                      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold text-foreground hover:border-primary/40 transition-colors"
                    >
                      <Phone className="size-4 text-primary" />
                      <span>+7 (916) 006-60-21</span>
                    </a>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>
      </div>
    </section>
  );
}

export default Header