/**
 * Role Management Modal
 * Komponenta pro správu konfigurovatelných rolí v scope
 */

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/translation';
import { Modal } from '@/app/components/ui/Modal';
import { ScopeRole } from '@/lib/domain/models/scope-role.model';
import { FiPlus, FiEdit, FiTrash2, FiEyeOff } from 'react-icons/fi';
import { useScopeRoles } from '@/app/hooks/useScopeRoles';
import { useToastFunctions } from '@/app/components/ui/Toast';

interface RoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  scopeId: string;
  onRolesChanged?: (roles: Array<{ id: string; key: string; label: string }>) => void;
}

export const RoleManagementModal: React.FC<RoleManagementModalProps> = ({
  isOpen,
  onClose,
  scopeId,
  onRolesChanged,
}) => {
  const { t } = useTranslation();
  const toast = useToastFunctions();
  const { roles, createRole, updateRole, deleteRole, initializeDefaultRoles, loading, error } = useScopeRoles(scopeId);
  
  const [editingRole, setEditingRole] = useState<ScopeRole | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    key: '',
    label: '',
    color: '#2563eb',
    translationKey: '',
    isActive: true,
    order: 0
  });

  const presetColors = ['#3b82f6', '#22c55e', '#ef4444', '#eab308', '#a855f7', '#14b8a6', '#f97316'];
  const isValidHex = (v: string) => /^#([0-9a-fA-F]{6})$/.test(v);
  const updateColor = (v: string) => setFormData({ ...formData, color: v });

  // Notify parent when roles change so lists can update immediately
  useEffect(() => {
    if (!onRolesChanged) return;
    const mapped = roles.filter(r => r.isActive).map(r => ({ id: r.id, key: r.key, label: r.label }));
    onRolesChanged(mapped);
  }, [roles, onRolesChanged]);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.key.trim() || !formData.label.trim()) return;

    try {
      await createRole(formData);
      setFormData({
        key: '',
        label: '',
        color: '#2563eb',
        translationKey: '',
        isActive: true,
        order: 0
      });
      setShowCreateForm(false);
      toast.success('Role vytvořena', `Role "${formData.label}" byla úspěšně vytvořena.`);
    } catch (error) {
      console.error('Failed to create role:', error);
      toast.error('Chyba při vytváření', 'Nepodařilo se vytvořit roli. Zkuste to prosím znovu.');
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !formData.label.trim()) return;

    try {
      await updateRole(editingRole.id, {
        label: formData.label,
        color: formData.color,
        translationKey: formData.translationKey,
        isActive: formData.isActive,
        order: formData.order
      });
      setEditingRole(null);
      setFormData({
        key: '',
        label: '',
        color: '#2563eb',
        translationKey: '',
        isActive: true,
        order: 0
      });
      toast.success('Role aktualizována', `Role "${formData.label}" byla úspěšně aktualizována.`);
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Chyba při aktualizaci', 'Nepodařilo se aktualizovat roli. Zkuste to prosím znovu.');
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm(t('confirmDeleteRole'))) return;

    const roleToDelete = roles.find(r => r.id === id);
    try {
      await deleteRole(id);
      toast.success('Role smazána', `Role "${roleToDelete?.label || 'Role'}" byla úspěšně smazána.`);
    } catch (error) {
      console.error('Failed to delete role:', error);
      toast.error('Chyba při mazání', 'Nepodařilo se smazat roli. Zkuste to prosím znovu.');
    }
  };

  const handleEditRole = (role: ScopeRole) => {
    setEditingRole(role);
    setFormData({
      key: role.key,
      label: role.label,
      color: role.color,
      translationKey: role.translationKey,
      isActive: role.isActive,
      order: role.order
    });
  };

  const handleInitializeDefaults = async () => {
    if (!confirm(t('confirmInitializeDefaults'))) return;

    try {
      const result = await initializeDefaultRoles();
      if (result && result.createdKeys && result.createdKeys.length > 0) {
        const createdRolesText = result.createdKeys.join(', ').toUpperCase();
        toast.success('Výchozí role vytvořeny', `Role ${createdRolesText} byly úspěšně vytvořeny.`);
      }
    } catch (error) {
      console.error('Failed to initialize defaults:', error);
      toast.error('Chyba při vytváření', 'Nepodařilo se vytvořit výchozí role. Zkuste to prosím znovu.');
    }
  };

  // Kontrola, zda už byly výchozí role inicializovány
  const defaultRoleKeys = ['fe', 'be', 'qa', 'pm', 'dpl'];
  const existingDefaultKeys = roles
    .filter(role => defaultRoleKeys.includes(role.key))
    .map(role => role.key);
  const hasAllDefaultRoles = defaultRoleKeys.every(key => existingDefaultKeys.includes(key));
  const missingDefaultRoles = defaultRoleKeys.filter(key => !existingDefaultKeys.includes(key));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('manageRoles')}
      description={((): string | undefined => {
        const d = t('manageRolesDescription');
        return d === 'manageRolesDescription' ? undefined : d;
      })()}
      icon={<FiEdit size={24} className="text-white" />}
    >
      <div className="space-y-6" role="region" aria-label={t('roles')}>
        {/* Initialize defaults button */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {t('roles')}
          </h3>
          <button
            onClick={handleInitializeDefaults}
            disabled={loading || hasAllDefaultRoles}
            className={`px-4 py-2 rounded-lg transition-all duration-200 ${
              hasAllDefaultRoles 
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
            } disabled:opacity-50`}
            title={hasAllDefaultRoles ? t('defaultRolesAlreadyInitialized') : ''}
          >
            {hasAllDefaultRoles 
              ? t('defaultRolesAlreadyInitialized') 
              : missingDefaultRoles.length > 0 && missingDefaultRoles.length < 5
                ? t('initializeMissingRoles')
                : t('initializeDefaults')
            }
          </button>
        </div>

        {/* Show missing roles info */}
        {missingDefaultRoles.length > 0 && missingDefaultRoles.length < 5 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">
                {t('missingRoles')}: {missingDefaultRoles.join(', ').toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">
                {error === 'Default roles have already been initialized' 
                  ? t('defaultRolesAlreadyInitialized') 
                  : error}
              </span>
            </div>
          </div>
        )}

        {/* Create new role button */}
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={loading}
          className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <FiPlus className="w-5 h-5" />
          {t('createRole')}
        </button>

        {/* Create role form */}
        {showCreateForm && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 md:p-5 space-y-3 border border-gray-200/60 dark:border-gray-600/50">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200">{t('createNewRole')}</h4>
            <form onSubmit={handleCreateRole} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('roleKey')}
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="fe"
                  required
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('roleLabel')}
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Frontend"
                  required
                />
              </div>
              <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('color')}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => updateColor(e.target.value)}
                      className="w-28 h-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 overflow-hidden"
                      aria-label={t('color')}
                    />
                    <input
                      type="text"
                      inputMode="text"
                      spellCheck={false}
                      value={formData.color}
                      onChange={(e) => {
                        const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                        if (v.length <= 7) updateColor(v.toLowerCase());
                      }}
                      onBlur={(e) => {
                        const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                        if (isValidHex(v)) updateColor(v.toLowerCase());
                      }}
                      placeholder="#2563eb"
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 font-mono text-sm"
                      aria-label="hex"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {presetColors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updateColor(c)}
                        className={`h-6 w-6 rounded-full ring-2 ${formData.color === c ? 'ring-gray-900/30 dark:ring-white/50' : 'ring-black/10 dark:ring-white/10'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        style={{ backgroundColor: c }}
                        aria-label={c}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-6 md:mt-8">
                  <span className="text-xs text-gray-500 dark:text-gray-300">{t('active')}</span>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="col-span-1 md:col-span-2 flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {t('create')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit role form */}
        {editingRole && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 md:p-5 space-y-3 border border-gray-200/60 dark:border-gray-600/50">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200">{t('editRole')}</h4>
            <form onSubmit={handleUpdateRole} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('roleLabel')}
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('color')}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => updateColor(e.target.value)}
                    className="w-28 h-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 overflow-hidden"
                    aria-label={t('color')}
                  />
                  <input
                    type="text"
                    inputMode="text"
                    spellCheck={false}
                    value={formData.color}
                    onChange={(e) => {
                      const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                      if (v.length <= 7) updateColor(v.toLowerCase());
                    }}
                    onBlur={(e) => {
                      const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                      if (isValidHex(v)) updateColor(v.toLowerCase());
                    }}
                    placeholder="#2563eb"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 font-mono text-sm"
                    aria-label="hex"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {presetColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateColor(c)}
                      className={`h-6 w-6 rounded-full ring-2 ${formData.color === c ? 'ring-gray-900/30 dark:ring-white/50' : 'ring-black/10 dark:ring-white/10'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      style={{ backgroundColor: c }}
                      aria-label={c}
                      title={c}
                    />
                  ))}
                </div>
              </div>
              <div className="col-span-1 md:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
                  {t('active')}
                </label>
              </div>
              <div className="col-span-1 md:col-span-2 flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {t('update')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Roles list */}
        {/* Skeleton při načítání */}
        {loading && (
          <ul className="space-y-3" aria-live="polite" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="animate-pulse">
                <div className="relative p-4 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/50">
                  <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </li>
            ))}
          </ul>
        )}

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3" role="list">
          {roles.map((role) => (
            <li key={role.id} role="listitem" className="h-full">
              <div
                className="group relative flex items-center justify-between p-3.5 md:p-4 rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/65 dark:bg-gray-800/65 backdrop-blur-[2px] shadow-sm hover:shadow-md transition-all duration-200 hover:bg-white/80 dark:hover:bg-gray-800/80 h-full"
              >
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 h-full w-1 rounded-l-2xl opacity-70"
                  style={{ backgroundColor: role.color }}
                />
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <span
                      className="inline-flex w-6 h-6 md:w-7 md:h-7 rounded-full ring-2 ring-black/5 dark:ring-white/10 shadow-inner"
                      style={{ backgroundColor: role.color }}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{role.label}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-200">
                        {role.key}
                      </span>
                    </div>
                    {!role.isActive && (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-gray-500" aria-label={t('inactive')}>
                        <FiEyeOff className="w-4 h-4" /> {t('inactive')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditRole(role)}
                    className="p-2 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label={t('editRole')}
                    title={t('editRole')}
                  >
                    <FiEdit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role.id)}
                    className="p-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label={t('deleteRole')}
                    title={t('deleteRole')}
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {roles.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            {t('noRolesFound')}
          </div>
        )}
      </div>
    </Modal>
  );
}; 