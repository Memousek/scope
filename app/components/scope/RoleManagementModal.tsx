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
  const { roles, createRole, updateRole, deleteRole, initializeDefaultRoles, loading } = useScopeRoles(scopeId);
  
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
      await initializeDefaultRoles();
    } catch (error) {
      console.error('Failed to initialize defaults:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('manageRoles')}
      icon={<FiEdit size={24} className="text-white" />}
    >
      <div className="space-y-6">
        {/* Initialize defaults button */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {t('roles')}
          </h3>
          <button
            onClick={handleInitializeDefaults}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50"
          >
            {t('initializeDefaults')}
          </button>
        </div>

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
        <div className="space-y-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: role.color }}
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {role.label}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {role.key}
                  </div>
                </div>
                {!role.isActive && (
                  <FiEyeOff className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditRole(role)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <FiEdit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteRole(role.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {roles.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            {t('noRolesFound')}
          </div>
        )}
      </div>
    </Modal>
  );
}; 