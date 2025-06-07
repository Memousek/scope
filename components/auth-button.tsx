'use client';

import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "./logout-button";
import { useEffect, useState } from "react";
import { UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function AuthButton() {
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user && data.user.email ? { email: data.user.email } : null);
    });
  }, []);

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/scopes" className="border-gray-200 pl-4 border-gray-200 pr-4 rounded-md  transition-colors cursor-pointer py-1 px-2">Seznam scopů</Link>  

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="border-gray-200 pl-4 border-gray-200 pr-4 rounded-md transition-colors cursor-pointer py-1 px-2 flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>
              <span className="text-sm">{user.email}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <LogoutButton />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Přihlásit se</Link>
      </Button>
    </div>
  );
}
