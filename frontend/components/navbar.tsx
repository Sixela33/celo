"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import MintButton from "./mintButton";

export function Navbar() {
  const pathname = usePathname();
  const nav = [
    { href: "/", label: "Home" },
    { href: "/crowdfunding/new", label: "New" },
  ];
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="font-semibold">
          Celo Crowdfund
        </Link>
        <nav className="flex items-center gap-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm text-muted-foreground hover:text-foreground",
                pathname === item.href && "text-foreground font-medium",
              )}
            >
              {item.label}
            </Link>
          ))}
          <ThemeSwitcher />
          <ConnectButton />
          <MintButton />
        </nav>
      </div>
    </header>
  );
}


