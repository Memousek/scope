import React, { useRef, useState } from "react";
import Papa from "papaparse";
import { Modal } from "./ui/Modal";
import { FiUpload } from "react-icons/fi";
import { useTranslation } from "@/lib/translation";
import type { VacationRange } from "./scope/types";

export type TeamImportMember = {
  name: string;
  role: string;
  fte: number;
  vacations?: VacationRange[];
};

interface TeamImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (members: TeamImportMember[]) => void;
}

export default function TeamImportModal({
  isOpen,
  onClose,
  onImport,
}: TeamImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [members, setMembers] = useState<TeamImportMember[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const { t } = useTranslation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const preview: TeamImportMember[] = [];
        const validation: string[] = [];
        // Mapování názvů sloupců na klíče (tolerantní)
        const normalize = (s: string) => s
          .replace(/^\uFEFF/, "")
          .trim()
          .toLowerCase()
          .normalize("NFD").replace(/\p{Diacritic}/gu, "");
        const nameTokens = ["name", "jmeno", "jméno", "clen", "osoba"]; // includes diacritics-free
        const roleTokens = ["role", "pozice", "funkce", "position"];
        const fteTokens = ["fte", "uvazek", "alokace", "allocation"];
        const vacationsKeys = ["vacations", "dovolena", "dovolene", "dovolenae", "dovolenej", "dovolené", "dovolená", "holiday", "holidays"];

        const toIso = (s: string): string | null => {
          const trimmed = s.trim();
          // ISO already
          if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
          // Accept DD.MM.YYYY
          const m = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
          if (m) {
            const [, dd, mm, yyyy] = m;
            return `${yyyy}-${mm}-${dd}`;
          }
          return null;
        };

        const parseVacations = (val: unknown): VacationRange[] | undefined => {
          if (typeof val !== "string") return undefined;
          const text = val.trim();
          if (!text) return undefined;
          // Supported formats per item:
          // YYYY-MM-DD..YYYY-MM-DD|note   or   YYYY-MM-DD..YYYY-MM-DD:note
          // Items separated by ; or ,
          const items = text.split(/[;,]+/).map((s) => s.trim()).filter(Boolean);
          const ranges: VacationRange[] = [];
          for (const item of items) {
            const [rangePart, notePart] = item.split(/[|:]/).map((s) => s.trim());
            const [start, end] = rangePart.split(/\.\.|–|—|to|-/).map((s) => s.trim());
            if (!start || !end) continue;
            const startIso = toIso(start);
            const endIso = toIso(end);
            if (!startIso || !endIso) continue;
            ranges.push({ start: startIso, end: endIso, note: notePart || undefined });
          }
          return ranges.length > 0 ? ranges : undefined;
        };

        (results.data as Array<Record<string, unknown>>).forEach((row, idx) => {
          const r = row as Record<string, string | number | undefined>;
          const keys = Object.keys(r);
          // Najdi správné klíče (fuzzy)
          const nameKey = keys.find((k) => nameTokens.some((t) => normalize(k).includes(t)));
          const roleKey = keys.find((k) => roleTokens.some((t) => normalize(k).includes(t)));
          const fteKey = keys.find((k) => fteTokens.some((t) => normalize(k).includes(t)));

          const name = nameKey ? r[nameKey] : "";
          const role = roleKey ? r[roleKey] : "";
          let fteVal = fteKey ? r[fteKey] : "";
          if (typeof fteVal === "string") fteVal = fteVal.replace(",", ".").trim();
          const vacKey = keys.find((k) => vacationsKeys.includes(normalize(k)) || normalize(k).includes("vac"));
          const vacations = vacKey ? parseVacations(r[vacKey]) : undefined;

          if (!name || !role || fteVal === undefined || fteVal === "") {
            validation.push(`${t("row")} ${idx + 2}: ${t("missingFields")}.`);
            return;
          }
          const fteNum = Number(fteVal);
          if (isNaN(fteNum) || fteNum <= 0) {
            validation.push(
              `${t("row")} ${idx + 2}: ${t("fteMustBePositive")}.`
            );
            return;
          }
          preview.push({ name: String(name), role: String(role), fte: fteNum, vacations });
        });
        setMembers(preview);
        setErrors(validation);
      },
    });
  };

  const handleImport = () => {
    if (members.length > 0 && errors.length === 0) {
      onImport(members);
      onClose();
      setMembers([]);
      setErrors([]);
      setFileName("");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("importTeamMembers")}
      icon={<FiUpload />}
    >
      <div className="mb-6 flex items-center gap-2 justify-center">
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
          {t("selectCSVFile")}
        </button>
        {fileName && (
          <span className="ml-4 text-base text-gray-400">{fileName}</span>
        )}
      </div>
      <span className="text-sm text-gray-400">{t("importTeamMembersDescription")}</span>
      {errors.length > 0 && (
        <div className="mb-4 text-red-500 bg-red-50 rounded-lg p-3 border border-red-200">
          <strong className="block mb-2">{t("fileErrors")}:</strong>
          <ul className="list-disc ml-6 text-sm">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
      {members.length > 0 && (
        <div className="mb-4 mt-4">
          <strong className="block mb-2 text-base text-gray-300">
            {t("previewImportedMembers")}:
          </strong>
          <div className="overflow-x-auto">
            <table className="w-full rounded-xl overflow-hidden border border-gray-700 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
              <thead>
                <tr className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white">
                  <th className="p-3 font-semibold text-lg text-left">
                    {t("name")}
                  </th>
                  <th className="p-3 font-semibold text-lg text-left">
                    {t("role")}
                  </th>
                  <th className="p-3 font-semibold text-lg text-left">
                    {t("fte")}
                  </th>
                  <th className="p-3 font-semibold text-lg text-left">
                    {t("vacations")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr
                    key={i}
                    className="border-t border-gray-700 hover:bg-gray-800 transition-all"
                  >
                    <td className="p-3 text-base text-white">{m.name}</td>
                    <td className="p-3 text-base text-white">{m.role}</td>
                    <td className="p-3 text-base text-white">{m.fte}</td>
                    <td className="p-3 text-base text-white">
                      {m.vacations && m.vacations.length > 0
                        ? m.vacations.map((v) => `${v.start}..${v.end}${v.note ? `|${v.note}` : ""}`).join("; ")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="flex justify-end gap-3 mt-8">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 rounded-xl bg-gray-700 text-gray-200 font-semibold hover:bg-gray-600 transition-all"
        >
            {t("cancel")}
        </button>
        <button
          type="button"
          onClick={handleImport}
          className="px-7 py-2 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={members.length === 0 || errors.length > 0}
        >
          {t("import")}
        </button>
      </div>
    </Modal>
  );
}
