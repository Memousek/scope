"use client";
/**
 * Read-only stránka pro anonymní zobrazení scope
 * - Zobrazí název, popis, tým, projekty a burndown
 * - Žádné editace, žádné akce, žádné exporty
 * - Nepotřebuje přihlášení
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface TeamMember { id: string; name: string; role: string; fte: number }
interface Project { id: string; name: string; priority: number; fe_mandays: number; be_mandays: number; qa_mandays: number; pm_mandays: number; dpl_mandays: number; fe_done: number; be_done: number; qa_done: number; pm_done: number; dpl_done: number; delivery_date: string }
interface Scope { id: string; name: string; description?: string }
interface ProjectProgress {
  id?: string;
  project_id: string;
  date: string; // ISO string
  fe_done?: number;
  be_done?: number;
  qa_done?: number;
  pm_done?: number;
  dpl_done?: number;
}

export default function ScopeViewPage() {
  const params = useParams();
  const { id } = params;
  const [scope, setScope] = useState<Scope | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [progressHistory, setProgressHistory] = useState<Record<string, ProjectProgress[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const supabase = createClient();
    supabase.from('scopes').select('id, name, description').eq('id', id).single().then(({ data }) => setScope(data));
    supabase.from('team_members').select('id, name, role, fte').eq('scope_id', id).then(({ data }) => setTeam(data || []));
    supabase.from('projects').select('id, name, priority, fe_mandays, be_mandays, qa_mandays, pm_mandays, dpl_mandays, fe_done, be_done, qa_done, pm_done, dpl_done, delivery_date').eq('scope_id', id).then(({ data }) => setProjects(data || []));
    setLoading(false);
  }, [id]);

  // Historie postupu projektů
  const fetchProgressHistory = useCallback(async (projectIds: string[]) => {
    if (!projectIds.length) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('project_progress')
      .select('*')
      .in('project_id', projectIds)
      .order('date', { ascending: true });
    if (data) {
      const grouped: Record<string, ProjectProgress[]> = {};
      data.forEach((row: any) => {
        if (!grouped[row.project_id]) grouped[row.project_id] = [];
        grouped[row.project_id].push(row);
      });
      setProgressHistory(grouped);
    }
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      fetchProgressHistory(projects.map((p: any) => p.id));
    }
  }, [projects, fetchProgressHistory]);

  // Burndown data (stejné jako v hlavní stránce)
  function getBurndownDataWithDates(project: any) {
    const feRem = Number(project.fe_mandays) * (1 - (Number(project.fe_done) || 0) / 100);
    const beRem = Number(project.be_mandays) * (1 - (Number(project.be_done) || 0) / 100);
    const qaRem = Number(project.qa_mandays) * (1 - (Number(project.qa_done) || 0) / 100);
    const feFte = team.filter(m => m.role === 'FE').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    const beFte = team.filter(m => m.role === 'BE').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    const qaFte = team.filter(m => m.role === 'QA').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    const feDays = feRem / feFte;
    const beDays = beRem / beFte;
    const qaDays = qaRem / qaFte;
    const feBeDays = Math.ceil(Math.max(feDays, beDays));
    const totalDays = feBeDays + Math.ceil(qaDays);
    const today = new Date();
    const data: any[] = [];
    const totalMandays = Number(project.fe_mandays) + Number(project.be_mandays) + Number(project.qa_mandays);
    const feBeShare = (Number(project.fe_mandays) + Number(project.be_mandays)) / totalMandays;
    const qaShare = Number(project.qa_mandays) / totalMandays;
    const history = progressHistory[project.id] || [];
    const historyMap: Record<string, any> = {};
    history.forEach(h => {
      const d = new Date(h.date);
      const key = d.toISOString().slice(0, 10);
      historyMap[key] = {
        fe: h.fe_done,
        be: h.be_done,
        qa: h.qa_done,
        pm: h.pm_done,
        dpl: h.dpl_done,
      };
    });
    let plannedDays = totalDays;
    if (project.delivery_date) {
      const plannedDate = new Date(project.delivery_date);
      let planned = 0;
      const d = new Date(today);
      while (d <= plannedDate) {
        if (d.getDay() !== 0 && d.getDay() !== 6) planned++;
        d.setDate(d.getDate() + 1);
      }
      plannedDays = planned - 1;
    }
    const lastKnown: Record<string, number> = { fe: 0, be: 0, qa: 0, pm: 0, dpl: 0 };
    const currentDate = new Date(today);
    for (let day = 0; day <= Math.max(totalDays, plannedDays); ) {
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
      const key = currentDate.toISOString().slice(0, 10);
      const entry: any = { date: `${currentDate.getDate()}.${currentDate.getMonth() + 1}.` };
      if (day <= plannedDays) {
        entry.ideal = feBeShare > 0 ? (day / plannedDays) * (feBeShare / (feBeShare + qaShare)) * 100 : 0;
        if (day > feBeDays && plannedDays > feBeDays) {
          entry.ideal = feBeShare * 100 + ((day - feBeDays) / (plannedDays - feBeDays)) * qaShare * 100;
        }
        if (entry.ideal > 100) entry.ideal = 100;
      } else {
        entry.ideal = null;
      }
      if (day <= totalDays) {
        entry.realPlan = feBeShare > 0 ? (day / totalDays) * (feBeShare / (feBeShare + qaShare)) * 100 : 0;
        if (day > feBeDays && totalDays > feBeDays) {
          entry.realPlan = feBeShare * 100 + ((day - feBeDays) / (totalDays - feBeDays)) * qaShare * 100;
        }
        if (entry.realPlan > 100) entry.realPlan = 100;
      } else {
        entry.realPlan = null;
      }
      if (day === 0) {
        ['fe', 'be', 'qa', 'pm', 'dpl'].forEach(role => {
          entry[role] = 0;
          lastKnown[role] = 0;
        });
      } else if (historyMap[key]) {
        ['fe', 'be', 'qa', 'pm', 'dpl'].forEach(role => {
          if (typeof historyMap[key][role] === 'number') {
            entry[role] = historyMap[key][role];
            lastKnown[role] = historyMap[key][role];
          } else {
            entry[role] = lastKnown[role];
          }
        });
      } else {
        ['fe', 'be', 'qa', 'pm', 'dpl'].forEach(role => {
          entry[role] = lastKnown[role];
        });
      }
      data.push(entry);
      currentDate.setDate(currentDate.getDate() + 1);
      day++;
    }
    if (history.length === 0 && totalDays > 0) {
      data[data.length - 1] = { ...data[data.length - 1] };
      ['fe', 'be', 'qa', 'pm', 'dpl'].forEach(role => {
        data[data.length - 1][role] = Number(project[`${role}_done`]) || 0;
      });
    }
    return data;
  }

  if (loading) return <div className="text-center mt-16">Načítám…</div>;
  if (!scope) return <div className="text-center mt-16 text-red-600">Scope nenalezen.</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 rounded-lg shadow mt-8">
      <h1 className="text-2xl font-bold text-center mb-2">{scope.name}</h1>
      <div className="text-center mb-4 text-blue-700">{scope.description}</div>
      <section className="mb-6">
        <div className="rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Členové týmu</h2>
          <div className="bg-gray-50 rounded p-3">
            <div className="flex font-semibold mb-2 text-gray-700">
              <div className="flex-1">Jméno člena týmu</div>
              <div className="w-32">Role</div>
              <div className="w-32">Úvazek v FTE</div>
            </div>
            {team.length === 0 ? (
              <div className="text-gray-400">Žádní členové</div>
            ) : (
              team.map(member => (
                <div className="flex items-center mb-2" key={member.id}>
                  <span className="flex-1">{member.name}</span>
                  <span className="w-32">{member.role}</span>
                  <span className="w-32">{member.fte}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
      <section>
        <div className="rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Projekty</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm rounded-lg shadow border border-gray-200">
              <thead>
                <tr className="bg-gray-50 text-gray-700 font-semibold">
                  <th className="px-3 py-2 text-left rounded-tl-lg">Název projektu</th>
                  <th className="px-3 py-2 text-right">Priorita</th>
                  <th className="px-3 py-2 text-right">FE (MD)</th>
                  <th className="px-3 py-2 text-right">BE (MD)</th>
                  <th className="px-3 py-2 text-right">QA (MD)</th>
                  <th className="px-3 py-2 text-right">% FE hotovo</th>
                  <th className="px-3 py-2 text-right">% BE hotovo</th>
                  <th className="px-3 py-2 text-right">% QA hotovo</th>
                  <th className="px-3 py-2 text-center">Termín dodání</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr><td colSpan={15} className="text-gray-400 text-center py-4">Žádné projekty</td></tr>
                ) : (
                  projects.map(project => (
                    <tr key={project.id} className="hover:bg-blue-50 transition">
                      <td className="px-3 py-2 align-middle font-medium text-gray-900 whitespace-nowrap">{project.name}</td>
                      <td className="px-3 py-2 align-middle text-right">{project.priority}</td>
                      <td className="px-3 py-2 align-middle text-right">{Number(project.fe_mandays) || 0}</td>
                      <td className="px-3 py-2 align-middle text-right">{Number(project.be_mandays) || 0}</td>
                      <td className="px-3 py-2 align-middle text-right">{Number(project.qa_mandays) || 0}</td>
                      <td className="px-3 py-2 align-middle text-right">{Number(project.fe_done) || 0} %</td>
                      <td className="px-3 py-2 align-middle text-right">{Number(project.be_done) || 0} %</td>
                      <td className="px-3 py-2 align-middle text-right">{Number(project.qa_done) || 0} %</td>
                      <td className="px-3 py-2 align-middle text-center">{project.delivery_date ? new Date(project.delivery_date).toLocaleDateString() : ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <div className="my-8">
        <h3 className="text-lg font-semibold mb-2">Burndown & termíny</h3>
        {projects.map(project => (
          <div key={project.id} className="mb-6 p-4 rounded-lg border bg-gray-50">
            <div className="flex flex-wrap gap-4 items-center mb-2">
              <span className="font-semibold">{project.name}</span>
              <span>Spočítaný termín dodání: <b>{project.delivery_date ? new Date(project.delivery_date).toLocaleDateString() : ''}</b></span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={getBurndownDataWithDates(project)} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={d => d} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip labelFormatter={d => d} />
                <Legend />
                <Line type="monotone" dataKey="fe" stroke="#2563eb" name="FE % hotovo" />
                <Line type="monotone" dataKey="be" stroke="#059669" name="BE % hotovo" />
                <Line type="monotone" dataKey="qa" stroke="#f59e42" name="QA % hotovo" />
                <Line type="monotone" dataKey="ideal" stroke="#888" name="Ideální průběh" strokeDasharray="5 5" />
                <Line type="monotone" dataKey="realPlan" stroke="#ccc" name="Reálný plán (ve skluzu)" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
} 