"use client";
import { useState } from "react";
import { Bug } from "lucide-react";
import { useTranslation } from "@/lib/translation"; 

export function BugReportButton() {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <div className="relative">
        <button
          aria-label="Report bug or add feature request"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          onClick={() => window.open("https://github.com/Memousek/scope/issues", "_blank")}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          tabIndex={0}
          type="button"
        >
          <Bug size={18} />
        </button>
        {hovered && (
          <div
            className="absolute right-14 top-1/2 -translate-y-1/2 px-3 py-2 rounded bg-gray-900 text-white text-xs shadow-lg animate-fade-in pointer-events-none whitespace-nowrap"
            style={{ minWidth: 180 }}
          >
            {t("bug_report")}
          </div>
        )}
      </div>
    </div>
  );
} 