import React, { useRef, useState } from "react";
import Papa from "papaparse";
import { Modal } from "./ui/Modal";
import { FiUpload } from "react-icons/fi";
import { useTranslation } from "@/lib/translation";

export type TeamImportMember = {
  name: string;
  role: string;
  fte: number;
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
        // Mapování názvů sloupců na klíče
        const nameKeys = ["name", "jméno", "jm", "člen", "osoba"];
        const roleKeys = ["role", "pozice", "funkce", "position"];
        const fteKeys = ["fte", "úvazek", "uvazek", "allocation", "alokace"];

        (results.data as Array<Record<string, unknown>>).forEach((row, idx) => {
          const r = row as Record<string, string | number | undefined>;
          // Najdi správné klíče
          const nameKey = Object.keys(r).find((k) =>
            nameKeys.includes(k.trim().toLowerCase())
          );
          const roleKey = Object.keys(r).find((k) =>
            roleKeys.includes(k.trim().toLowerCase())
          );
          const fteKey = Object.keys(r).find((k) =>
            fteKeys.includes(k.trim().toLowerCase())
          );

          const name = nameKey ? r[nameKey] : "";
          const role = roleKey ? r[roleKey] : "";
          let fteVal = fteKey ? r[fteKey] : "";
          if (typeof fteVal === "string") fteVal = fteVal.trim();

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
          preview.push({ name: String(name), role: String(role), fte: fteNum });
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
      <div className="mb-6">
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
        <div className="mb-4">
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
          className="px-7 py-2 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold shadow-lg hover:scale-105 transition-all"
          disabled={members.length === 0 || errors.length > 0}
        >
          {t("import")}
        </button>
      </div>
    </Modal>
  );
}
