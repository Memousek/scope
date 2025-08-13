/**
 * TeamImportModal
 *
 * Modal pro import členů týmu z CSV souboru nebo z URL.
 * Průběh: idle -> mapping (interaktivní mapování sloupců) -> preview (náhled validních záznamů) -> import.
 *
 * Přístupnost: formulářové prvky s labely, klávesa Enter spouští načtení z URL,
 *                chyby i změny náhledu jsou oznamovány přes aria-live.
 */
import React, { useMemo, useRef, useState } from "react";
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
  const { t } = useTranslation();

  // State
  const [members, setMembers] = useState<TeamImportMember[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [url, setUrl] = useState<string>("");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Array<Record<string, unknown>>>([]);
  const [headerMap, setHeaderMap] = useState<{ name?: string; role?: string; fte?: string; vacations?: string }>({});
  const [mappingStage, setMappingStage] = useState<"idle" | "mapping" | "preview">("idle");
  const [loadingFromUrl, setLoadingFromUrl] = useState(false);
  const loadingText = (t("loading") as string) || "Načítám…";

  // Reset zpět na výběr zdroje (soubor/URL)
  const resetSource = () => {
    setMembers([]);
    setErrors([]);
    setUrl("");
    setRawHeaders([]);
    setRawRows([]);
    setHeaderMap({});
    setMappingStage("idle");
  };

  // Helpers
  const toIso = (s: string): string | null => {
    const trimmed = s.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
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
    const items = text.split(/[;,]+/).map((s) => s.trim()).filter(Boolean);
    const ranges: VacationRange[] = [];
    for (const item of items) {
      const [rangePart, notePart] = item.split(/[|:]/).map((s) => s.trim());
      const [start, end] = rangePart.split(/\.{2}|–|—|to|-/).map((s) => s.trim());
      if (!start || !end) continue;
      const startIso = toIso(start);
      const endIso = toIso(end);
      if (!startIso || !endIso) continue;
      ranges.push({ start: startIso, end: endIso, note: notePart || undefined });
    }
    return ranges.length > 0 ? ranges : undefined;
  };

  // Initial mapping suggestion from headers
  const initializeMapping = (headers: string[]) => {
    const normalize = (s: string) => s.replace(/^\uFEFF/, "").trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const nameTokens = ["name", "jmeno", "jméno", "clen", "osoba"];
    const roleTokens = ["role", "pozice", "funkce", "position"];
    const fteTokens = ["fte", "uvazek", "alokace", "allocation"];
    const vacTokens = ["vacations", "dovol", "holiday", "holidays", "vac"];
    const initial: { name?: string; role?: string; fte?: string; vacations?: string } = {};
    headers.forEach((h) => {
      const n = normalize(h);
      if (!initial.name && nameTokens.some((t) => n.includes(t))) initial.name = h;
      if (!initial.role && roleTokens.some((t) => n.includes(t))) initial.role = h;
      if (!initial.fte && fteTokens.some((t) => n.includes(t))) initial.fte = h;
      if (!initial.vacations && vacTokens.some((t) => n.includes(t))) initial.vacations = h;
    });
    setHeaderMap(initial);
    setMembers([]);
    setErrors([]);
    setMappingStage("mapping");
  };

  // File upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Array<Record<string, unknown>>;
        const headers = (results.meta.fields as string[] | undefined) || Object.keys(rows[0] || {});
        setRawHeaders(headers);
        setRawRows(rows);
        initializeMapping(headers);
      },
    });
  };

  // URL fetch
  // Načtení CSV z URL (spustitelné i klávesou Enter v inputu)
  const handleFetchFromUrl = async () => {
    if (!url) return;
    try {
      setLoadingFromUrl(true);
      const res = await fetch(url);
      const text = await res.text();
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as Array<Record<string, unknown>>;
          const headers = (results.meta.fields as string[] | undefined) || Object.keys(rows[0] || {});
          setRawHeaders(headers);
          setRawRows(rows);
          initializeMapping(headers);
        },
      });
    } catch {
      setErrors(["URL fetch failed"]);
    } finally {
      setLoadingFromUrl(false);
    }
  };

  // Build preview using current mapping
  const mappedPreview = useMemo(() => {
    if (mappingStage === "idle") return { list: [] as TeamImportMember[], errs: [] as string[] };
    const preview: TeamImportMember[] = [];
    const validation: string[] = [];
    rawRows.forEach((row, idx) => {
      const r = row as Record<string, string | number | undefined>;
      const name = headerMap.name ? r[headerMap.name] : "";
      const role = headerMap.role ? r[headerMap.role] : "";
      let fteVal = headerMap.fte ? r[headerMap.fte] : "";
      if (typeof fteVal === "string") fteVal = fteVal.replace(",", ".").trim();
      const vacations = headerMap.vacations ? parseVacations(r[headerMap.vacations]) : undefined;
      if (!name || !role || fteVal === undefined || fteVal === "") {
        validation.push(`${t("row")} ${idx + 2}: ${t("missingFields")}.`);
        return;
      }
      const fteNum = Number(fteVal);
      if (Number.isNaN(fteNum) || fteNum <= 0) {
        validation.push(`${t("row")} ${idx + 2}: ${t("fteMustBePositive")}.`);
        return;
      }
      preview.push({ name: String(name), role: String(role), fte: fteNum, vacations });
    });
    return { list: preview, errs: validation };
  }, [headerMap, mappingStage, rawRows, t]);

  const applyMapping = () => {
    const { list, errs } = mappedPreview;
    setMembers(list);
    setErrors(errs);
    setMappingStage("preview");
  };

  const handleImport = () => {
    if (members.length > 0 && errors.length === 0) {
      onImport(members);
      onClose();
      setMembers([]);
      setErrors([]);
      setUrl("");
      setRawHeaders([]);
      setRawRows([]);
      setHeaderMap({});
      setMappingStage("idle");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("importTeamMembers")}
      icon={<FiUpload />}
    >
      {mappingStage === "idle" && (
      <div className="mb-6 flex items-center gap-2 justify-center flex-col" aria-busy={loadingFromUrl}>
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
          aria-label={t("selectCSVFile")}
        >
          {t("selectCSVFile")}
        </button>
        <span className="text-sm text-gray-400 relative">
          {t("or")}
        </span>
        <label htmlFor="url" className="text-sm text-gray-400">{t("insertCSVFromURL")}:</label>
        <input
          id="url"
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleFetchFromUrl();
            }
          }}
          className="text-base text-gray-400 w-full p-2 rounded-xl border border-gray-700"
          placeholder={t("insertCSVFromURLPlaceholder")}
          aria-describedby="import-desc"
        />
        <button
          type="button"
          onClick={handleFetchFromUrl}
          disabled={!url || loadingFromUrl}
          className={`bg-blue-500 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 active:scale-95 ${!url || loadingFromUrl ? "opacity-50 cursor-not-allowed" : ""}`}
          aria-label={t("updateFromURL")}
        >
          {loadingFromUrl ? loadingText : t("updateFromURL")}
        </button>
      </div>
      )}
      {mappingStage === "idle" && (
        <span id="import-desc" className="text-sm text-gray-400">{t("importTeamMembersDescription")}</span>
      )}

      {mappingStage === "mapping" && (
        <div className="mt-4 rounded-xl border border-gray-700 p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="mb-3 font-semibold text-white">{t("columnMapping") || "Mapování sloupců"}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(["name","role","fte","vacations"] as const).map((k) => (
              <div key={k} className="flex items-center gap-2">
                <label className="w-28 text-sm text-gray-300">{t(k)}</label>
                <select
                  className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2"
                  value={headerMap[k] || ''}
                  onChange={(e) => setHeaderMap((m) => ({ ...m, [k]: e.target.value || undefined }))}
                >
                  <option value="">—</option>
                  {rawHeaders.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <button
              type="button"
              className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold"
              onClick={applyMapping}
              aria-label={(t("preview") as string) || "Náhled"}
            >
              {t("preview") || "Náhled"}
            </button>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mb-4 mt-4 text-red-500 bg-red-50 rounded-lg p-3 border border-red-200" role="alert" aria-live="assertive" aria-atomic="true">
          <strong className="block mb-2">{t("fileErrors")}:</strong>
          <ul className="list-disc ml-6 text-sm">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {mappingStage === "preview" && members.length > 0 && (
        <div className="mb-4 mt-4">
          <strong className="block mb-2 text-base text-gray-300">
            {t("previewImportedMembers")}:
          </strong>
          <div className="overflow-x-auto">
            <table className="w-full rounded-xl overflow-hidden border border-gray-700 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" aria-live="polite">
              <caption className="sr-only">{t("previewImportedMembers")}</caption>
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

      <div className="flex justify-between items-center gap-3 mt-8">
        {mappingStage !== 'idle' && (
          <button
            type="button"
            onClick={resetSource}
            className="px-4 py-2 rounded-xl bg-gray-600 text-gray-100 font-semibold hover:bg-gray-500 transition-all"
          >
            {t("changeSource")}
          </button>
        )}
        <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 rounded-xl bg-gray-700 text-gray-200 font-semibold hover:bg-gray-600 transition-all"
          aria-label={t("cancel")}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={handleImport}
          className="px-7 py-2 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={mappingStage !== 'preview' || members.length === 0 || errors.length > 0}
          aria-disabled={mappingStage !== 'preview' || members.length === 0 || errors.length > 0}
        >
          {t("import")}
        </button>
        </div>
      </div>
    </Modal>
  );
}
