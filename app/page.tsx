import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { Header } from "@/components/header";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
      <Header />
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          <main className="flex-1 flex flex-col gap-6 px-4">
            <h2 className="font-medium text-xl mb-4">Scope burndown</h2>
            <p>
                Scope burndown is a tool that helps you track the progress of your project.
            </p>
            <p>It is a tool that helps you track the progress of your project.</p>
          </main>
        </div>
      </div>
    </main>
  );
}
