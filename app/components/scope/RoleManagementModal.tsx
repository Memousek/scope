/**
 * Role Management Modal
 * Komponenta pro správu konfigurovatelných rolí v scope
 */

import { useState } from 'react';
import { useTranslation } from '@/lib/translation';
import { Modal } from '@/app/components/ui/Modal';
import { ScopeRole } from '@/lib/domain/models/scope-role.model';
import { FiPlus, FiEdit, FiTrash2, FiEyeOff } from 'react-icons/fi';
import { useScopeRoles } from '@/app/hooks/useScopeRoles';

interface RoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  scopeId: string;
}

export const RoleManagementModal: React.FC<RoleManagementModalProps> = ({
  isOpen,
  onClose,
  scopeId
}) => {
  const { t } = useTranslation();
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
    } catch (error) {
      console.error('Failed to create role:', error);
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
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm(t('confirmDeleteRole'))) return;

    try {
      await deleteRole(id);
    } catch (error) {
      console.error('Failed to delete role:', error);
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
        alert(`${t('rolesCreatedSuccessfully')}: ${createdRolesText}`);
      }
    } catch (error) {
      console.error('Failed to initialize defaults:', error);
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
      description={t('manageRolesDescription')}
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
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200">{t('createNewRole')}</h4>
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
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
              <div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('color')}
                </label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {t('create')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit role form */}
        {editingRole && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200">{t('editRole')}</h4>
            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div>
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
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
              <div className="flex items-center gap-2">
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
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {t('update')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Roles list */}
        <ul className="space-y-3" role="list">
          {roles.map((role) => (
            <li key={role.id} role="listitem">
              <div
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: role.color }}
                    aria-hidden="true"
                  />
                  <div className="truncate">
                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {role.label}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {role.key}
                    </div>
                  </div>
                  {!role.isActive && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500" aria-label={t('inactive')}>
                      <FiEyeOff className="w-4 h-4" /> {t('inactive')}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditRole(role)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label={t('editRole')}
                  >
                    <FiEdit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label={t('deleteRole')}
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