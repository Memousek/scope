import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12 bg-white dark:bg-gray-800">
      <div className="flex flex-col gap-2 items-start">
        <h2 className="font-bold text-2xl mb-4">Váš profil</h2>
        <pre className="text-xs font-mono p-3 rounded border max-h-32 overflow-auto">
          {JSON.stringify(data.user, null, 2)}
        </pre>
      </div>
    </div>
  );
}
