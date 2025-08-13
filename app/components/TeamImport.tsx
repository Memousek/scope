
import React, { useRef } from "react";
import Papa, { ParseResult } from "papaparse";
import { useTranslation } from "@/lib/translation";

type TeamMember = {
  name: string;
  role: string;
  fte: number;
  scope_id?: string;
};

type TeamImportProps = {
  onImport: (members: TeamMember[]) => void;
};

export default function TeamImport({ onImport }: TeamImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<TeamMember>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: ParseResult<TeamMember>) => {
        // Filter only valid rows
  const members = results.data.filter((row: TeamMember) => row.name && row.role && row.fte !== undefined);
        onImport(members);
      },
    });
  };

  return (
    <div>
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        className="relative group bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 active:scale-95"
      >
        <span className="relative z-10 flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          {t("importTeam")}
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </button>
    </div>
  );
}
