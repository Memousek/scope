"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
import { ArrowLeft, ArrowRight } from "lucide-react";

export function CarouselDemo() {
  const [slide, setSlide] = useState(0);
  const slides = [
    (
      <motion.div
        key="burndown"
        className="max-w-xl mx-auto text-center"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Burndown graf</h2>
        <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl shadow p-4 mb-2">
          <Line
            data={{
              labels: ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"],
              datasets: [
                {
                  label: "Skutečný",
                  data: [100, 85, 70, 60, 40, 25, 10],
                  borderColor: "#6366f1",
                  backgroundColor: "#6366f1",
                  tension: 0.3,
                  pointRadius: 3,
                  pointBackgroundColor: "#6366f1",
                },
                {
                  label: "Ideální",
                  data: [100, 83, 66, 49, 32, 15, 0],
                  borderColor: "#10b981",
                  backgroundColor: "#10b981",
                  borderDash: [5, 5],
                  tension: 0.1,
                  pointRadius: 0,
                },
                {
                  label: "AI predikce",
                  data: [100, 85, 70, 60, 45, 30, 18],
                  borderColor: "#f59e42",
                  backgroundColor: "#f59e42",
                  borderDash: [2, 6],
                  tension: 0.4,
                  pointRadius: 2,
                  pointBackgroundColor: "#f59e42",
                },
                {
                  label: "Odhad termínu",
                  data: [null, null, null, null, null, null, 0],
                  borderColor: "#ef4444",
                  backgroundColor: "#ef4444",
                  borderDash: [8, 4],
                  pointRadius: 5,
                  pointBackgroundColor: "#ef4444",
                  spanGaps: true,
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } },
                title: { display: false },
                tooltip: { mode: 'index', intersect: false },
              },
              interaction: { mode: 'nearest', axis: 'x', intersect: false },
              scales: {
                y: { beginAtZero: true, title: { display: false } },
                x: { title: { display: false } },
              },
            }}
            height={180}
          />
        </div>
        <div className="mb-2">
          <div className="text-base font-semibold text-blue-600">Odhad: <span className="font-bold">Ne 17. 8. 2025</span></div>
          <div className="text-base text-gray-700 dark:text-gray-300">Reálný termín: <span className="font-bold">Ne 17. 8. 2025</span></div>
          <div className="text-base text-red-600 mt-1">{10 > 0 ? "Pozor: projekt nestíhá ideální termín!" : "Projekt je na dobré cestě."}</div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Sledujte progres, predikci AI a termíny. Reagujte včas na odchylky.</p>
      </motion.div>
    ),
    (
      <motion.div
        key="overview"
        className="max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Ukázka přehledu projektu</h2>
        <div className="bg-gradient-to-br from-blue-900/80 to-purple-900/80 rounded-2xl shadow-xl p-6 text-white relative">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-bold">Priorita 1</div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 rounded-full px-3 py-1 text-sm font-semibold">30%</span>
              <span className="text-red-400 font-bold">-1 dní</span>
            </div>
          </div>
          <div className="mb-4">
            <div className="font-bold text-xl">Projekt X <span className="bg-blue-500 text-white rounded px-2 py-1 text-xs ml-2">V průběhu</span></div>
          </div>
          <div className="mb-4 border border-gray-700 rounded-xl p-5 bg-gray-800">
            <div className="font-semibold mb-1">Workflow</div>
            <div className="flex gap-2">
              <div className="bg-purple-600 text-white rounded-full px-3 py-1 text-xs font-bold">BE - FE - QA</div>
            </div>
          </div>
          <div className="mb-4">
            <div className="font-semibold mb-1">Role a průběh</div>
            <div className="flex gap-4">
              <div className="bg-gray-800 rounded-xl p-3 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-red-500 text-white rounded px-2 py-1 text-xs">Chybí nastavený člen</span>
                  <span className="font-bold">BE</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full mb-1">
                  <div className="h-2 bg-yellow-400 rounded-full" style={{ width: '50%' }}></div>
                </div>
                <div className="text-xs">25/50.0 MD <span className="ml-2">50% hotovo</span></div>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold">FE</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full mb-1">
                  <div className="h-2 bg-blue-400 rounded-full" style={{ width: '10%' }}></div>
                </div>
                <div className="text-xs">5/50.0 MD <span className="ml-2">10% hotovo</span></div>
              </div>
            </div>
          </div>
          <div className="mb-4">
            <div className="font-semibold mb-1">Progress grafy</div>
            <div className="bg-gray-900 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-2">Ideální průběh • BE • FE • Celkový průběh</div>
              <Line
                data={{
                  labels: ["10. 8.", "15. 8.", "20. 8.", "25. 8.", "30. 8.", "5. 9.", "10. 9.", "15. 9.", "20. 9.", "25. 9.", "30. 9.", "5. 10.", "10. 10."],
                  datasets: [
                    {
                      label: "Ideální průběh",
                      data: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 100, 100],
                      borderColor: "#6366f1",
                      backgroundColor: "#6366f1",
                      borderDash: [5, 5],
                      tension: 0.1,
                      pointRadius: 0,
                    },
                    {
                      label: "BE",
                      data: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 50, 50],
                      borderColor: "#f59e42",
                      backgroundColor: "#f59e42",
                      tension: 0.3,
                      pointRadius: 3,
                      pointBackgroundColor: "#f59e42",
                    },
                    {
                      label: "FE",
                      data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10],
                      borderColor: "#10b981",
                      backgroundColor: "#10b981",
                      tension: 0.3,
                      pointRadius: 3,
                      pointBackgroundColor: "#10b981",
                    },
                    {
                      label: "Celkový průběh",
                      data: [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 60, 60],
                      borderColor: "#3b82f6",
                      backgroundColor: "#3b82f6",
                      tension: 0.2,
                      pointRadius: 2,
                      pointBackgroundColor: "#3b82f6",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } },
                    title: { display: false },
                    tooltip: { mode: 'index', intersect: false },
                  },
                  interaction: { mode: 'nearest', axis: 'x', intersect: false },
                  scales: {
                    y: { beginAtZero: true, title: { display: false } },
                    x: { title: { display: false } },
                  },
                }}
                height={120}
              />
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <div>Odhad dokončení: <span className="text-white font-bold">10. 10. 2025</span></div>
                <div>Rezerva/Skuz: <span className="text-white font-bold">-1 dní</span></div>
                <div>Skuz: <span className="text-white font-bold">0 dní</span></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    ),
  ];

  return (
    <div className="relative">
      <div className="overflow-hidden min-h-[400px]">
        <AnimatePresence mode="wait">
          {slides.map((content, idx) =>
            idx === slide ? (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.5 }}
              >
                {content}
              </motion.div>
            ) : null
          )}
        </AnimatePresence>
      </div>
      <div className="flex justify-center items-center gap-4 mt-4">
        <button
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 hover:text-white transition"
          onClick={() => setSlide((slide - 1 + slides.length) % slides.length)}
          aria-label="Předchozí slide"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{slide + 1} / {slides.length}</span>
        <button
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 hover:text-white transition"
          onClick={() => setSlide((slide + 1) % slides.length)}
          aria-label="Další slide"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
