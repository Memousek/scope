/**
 * Explanation Modal Component
 * Provides a reusable modal for explaining project metrics and concepts
 * Uses the generic Modal component for consistent behavior
 */

import { ReactNode } from 'react';
import { FiInfo } from 'react-icons/fi';
import { Modal } from '@/app/components/ui/Modal';
import { useTranslation } from '@/lib/translation';

interface ExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectSlippage: number | null;
  children?: ReactNode;
}

export function ExplanationModal({ 
  isOpen, 
  onClose, 
  currentProjectSlippage,
  children 
}: ExplanationModalProps) {
  const { t } = useTranslation();

  const getStatusMessage = (slippage: number) => {
    if (slippage > 10) {
      return (
        <span className="text-green-600 dark:text-green-400 font-semibold">
          Projekt je v předstihu o {slippage} pracovních dní.
        </span>
      );
    } else if (slippage >= -10) {
      return (
        <span className="text-blue-600 dark:text-blue-400 font-semibold">
          Projekt je na čas. 
        </span>
      );
    } else if (slippage >= -30) {
      return (
        <span className="text-orange-600 dark:text-orange-400 font-semibold">
          Projekt je ve skluzu o {Math.abs(slippage)} pracovních dní.
        </span>
      );
    } else {
      return (
        <span className="text-red-600 dark:text-red-400 font-semibold">
          Projekt je kriticky ve skluzu o {Math.abs(slippage)} pracovních dní.
        </span>
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("explainReserveOrSlip")}
      icon={<FiInfo className="w-6 h-6 text-white" />}
      maxWidth="4xl"
    >
      <div className="space-y-6 text-gray-700 dark:text-gray-300">
        {/* Reserve/Slip Explanation */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Co znamená {currentProjectSlippage !== null ? (currentProjectSlippage >= 0 ? `+${currentProjectSlippage}` : `${currentProjectSlippage}`) : '+50'} dní?
          </h4>
          <p className="text-sm leading-relaxed">
            {currentProjectSlippage !== null ? (
              <>
                <strong className={currentProjectSlippage >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                  {currentProjectSlippage >= 0 ? `+${currentProjectSlippage}` : `${currentProjectSlippage}`} dní
                </strong> znamená, že projekt má <strong>{currentProjectSlippage >= 0 ? "rezervu" : "skluz"} {Math.abs(currentProjectSlippage)} pracovních dní</strong> {currentProjectSlippage >= 0 ? "před" : "za"} plánovaným termínem dokončení.
              </>
            ) : (
              <>
                <strong className="text-green-600 dark:text-green-400">+50 dní</strong> znamená, že projekt má <strong>rezervu 50 pracovních dní</strong> před plánovaným termínem dokončení.
              </>
            )}
          </p>
        </div>

        {/* Project Status */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Jak na tom projekt je?
          </h4>
          <p className="text-sm leading-relaxed">
            {currentProjectSlippage !== null ? (
              getStatusMessage(currentProjectSlippage)
            ) : (
              <span className="text-gray-600 dark:text-gray-400">
                Zde se zobrazí aktuální stav projektu
              </span>
            )}
          </p>
        </div>

        {/* Calculation Explanation */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Jak se to počítá?
          </h4>
          <p className="text-sm leading-relaxed">
            Aplikace bere v úvahu:
          </p>
          <ul className="text-sm leading-relaxed mt-2 space-y-1 list-disc list-inside">
            <li>Zbývající práci v mandays</li>
            <li>Přiřazené členy týmu a jejich FTE (Full-Time Equivalent)</li>
            <li>Dovolené a nepřítomnosti členů týmu</li>
            <li>Závislosti mezi projekty</li>
            <li>Pracovní dny (bez víkendů a svátků)</li>
          </ul>
        </div>

        {/* Date Types Explanation */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Různé typy termínů
          </h4>
          <div className="space-y-3">
            <div>
              <strong className="text-blue-600 dark:text-blue-400">Delivery Date:</strong>
              <p className="text-sm mt-1">Původní termín dodání zadaný při vytvoření projektu</p>
            </div>
            <div>
              <strong className="text-purple-600 dark:text-purple-400">Priority Date:</strong>
              <p className="text-sm mt-1">Termín upravený podle priority a závislostí mezi projekty</p>
            </div>
            <div>
              <strong className="text-green-600 dark:text-green-400">Calculated Date:</strong>
              <p className="text-sm mt-1">Skutečný termín dokončení vypočítaný na základě práce a kapacity týmu</p>
            </div>
          </div>
        </div>

        {/* Team Assignment Explanation */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Přiřadit členy týmu
          </h4>
          <p className="text-sm leading-relaxed">
            Tato funkce umožňuje přiřadit konkrétní členy týmu k projektu. Když přiřadíte členy týmu:
          </p>
          <ul className="text-sm leading-relaxed mt-2 space-y-1 list-disc list-inside">
            <li>Výpočet termínu dokončení se zpřesní podle skutečné dostupnosti členů</li>
            <li>Zohlední se jejich dovolené a nepřítomnosti</li>
            <li>FTE (Full-Time Equivalent) určuje, kolik času věnují projektu</li>
            <li>Bez přiřazení se používá průměrná dostupnost celého týmu</li>
          </ul>
        </div>

        {/* Additional content */}
        {children}
      </div>
    </Modal>
  );
}
