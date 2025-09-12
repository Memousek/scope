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
      <Button variant="ghost" size={"sm"} className="bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-xl shadow-lg hover:scale-105 transition-all duration-300">
        <Bell
          size={ICON_SIZE}
        />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="relative">
        <Button variant="ghost" size={"sm"} className="bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-xl shadow-lg hover:scale-105 transition-all duration-300">
          <Bell
            size={ICON_SIZE}
          />
          
        <div className="absolute -top-2 right-0 p-1">
          <span className="text-xs font-semibold text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full px-2 py-1 shadow-lg">3</span>
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
