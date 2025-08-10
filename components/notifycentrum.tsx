"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const NotifyCentrum = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const ICON_SIZE = 16;

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset theme when component mounts
  useEffect(() => {
    if (mounted) {
      const savedTheme = localStorage.getItem('scope-theme');
      if (savedTheme && savedTheme !== theme) {
        setTheme(savedTheme);
      }
    }
  }, [mounted, theme, setTheme]);

  if (!mounted) {
    return (
      <Button variant="ghost" size={"sm"}>
        <Bell
          size={ICON_SIZE}
        />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="relative">
        <Button variant="ghost" size={"sm"}>
          <Bell
            size={ICON_SIZE}
          />
          
        <div className="absolute -top-2 right-0 p-1">
          <span className="text-xs font-semibold text-black bg-red-200 rounded-full px-1">3</span>
        </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-content" align="start">
        ...
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { NotifyCentrum };
