/**
 * Modální okno pro editaci profilu uživatele
 * Umožňuje změnu jména, avataru a hesla
 */
import { useState, useRef } from "react";
import { Camera, Eye, EyeOff, Loader2, User } from "lucide-react";
import Image from "next/image";
import { User as UserModel } from "@/lib/domain/models/user.model";
import { ContainerService } from "@/lib/container.service";
import { UserRepository } from "@/lib/domain/repositories/user.repository";
import { FileUploadService } from "@/lib/services/fileUploadService";
import { useTranslation } from "@/lib/translation";
import { Modal } from "@/app/components/ui/Modal";

interface EditProfileModalProps {
  user: UserModel;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedUser: UserModel) => void;
}

export function EditProfileModal({ user, isOpen, onClose, onUpdate }: EditProfileModalProps) {
  const { t } = useTranslation();
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  interface FormData {
    fullName: string;
    avatarUrl: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }

  const [formData, setFormData] = useState<FormData>({
    fullName: typeof user.additional?.full_name === "string" ? user.additional.full_name : "",
    avatarUrl: typeof user.additional?.avatar_url === "string" ? user.additional.avatar_url : "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileUploadService = new FileUploadService();

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validace souboru
    const validation = fileUploadService.validateFile(file);
    if (!validation.isValid) {
      setError(validation.error || 'Neplatný soubor');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Upload souboru na Supabase Storage
      const avatarUrl = await fileUploadService.uploadAvatar(file, user.id);
      
      if (avatarUrl) {
        setFormData(prev => ({
          ...prev,
          avatarUrl: avatarUrl
        }));
        setSuccess('Avatar byl úspěšně nahrán');
      } else {
        setError('Nepodařilo se nahrát avatar');
      }
    } catch {
      setError('Došlo k chybě při nahrávání avataru');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!formData.fullName.trim()) {
      setError(t("nameRequired"));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Smazat starý avatar pokud se změnil
      if (user.avatarUrl && user.avatarUrl !== formData.avatarUrl) {
        await fileUploadService.deleteAvatar(user.avatarUrl);
      }

      // Aktualizace user_meta přes Supabase
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase
        .from("user_meta")
        .update({
          full_name: formData.fullName,
          avatar_url: formData.avatarUrl
        })
        .eq("user_id", user.id);

      if (error) {
        setError(t("failedToUpdateProfile"));
        return;
      }

      // Načtení nových dat z user_meta
      const { data: metaData, error: fetchError } = await supabase
        .from("user_meta")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (fetchError || !metaData) {
        setError(t("failedToUpdateProfile"));
        return;
      }

      // Aktualizace uživatele v UI
      const updatedUser = {
        ...user,
        additional: {
          ...user.additional,
          ...metaData
        },
        avatarUrl: typeof metaData.avatar_url === "string" ? metaData.avatar_url : user.avatarUrl,
        fullName: typeof metaData.full_name === "string" ? metaData.full_name : user.fullName
      };
      onUpdate(updatedUser);
      setSuccess(t("profileUpdatedSuccessfully"));
    } catch {
      setError(t("errorUpdatingProfile"));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError(t("allFieldsRequired"));
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError(t("passwordsDoNotMatch"));
      return;
    }

    if (formData.newPassword.length < 6) {
      setError(t("passwordMinLength"));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const userRepository = ContainerService.getInstance().get(UserRepository);
      const success = await userRepository.updateUserPassword(user.id, formData.newPassword);

      if (success) {
        setSuccess(t("passwordChangedSuccessfully"));
        setFormData(prev => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        }));
        setIsPasswordChanging(false);
      } else {
        setError(t("failedToChangePassword"));
      }
    } catch {
      setError(t("errorChangingPassword"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upravit profil"
      description="Změňte své osobní údaje a heslo"
      icon={<User className="w-6 h-6 text-white" />}
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Avatar Section */}
        <div className="text-center">
          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:shadow-xl transition-shadow" onClick={handleAvatarClick}>
              {loading ? (
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              ) : formData.avatarUrl ? (
                <Image 
                  src={formData.avatarUrl} 
                  alt="Avatar" 
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-scale-down" 
                />
              ) : (
                <Camera className="w-10 h-10 text-white" />
              )}
            </div>
            <button 
              className="absolute bottom-0 right-0 w-6 h-6 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md"
              disabled={loading}
            >
              <Camera className="w-3 h-3 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Klikněte pro změnu avataru
          </p>
        </div>

        {/* Profile Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Jméno
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t("enterYourName")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Email nelze změnit
            </p>
          </div>
        </div>

        {/* Password Change Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              Změna hesla
            </h4>
            <button
              onClick={() => setIsPasswordChanging(!isPasswordChanging)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {isPasswordChanging ? t("cancel") : t("changePassword")}
            </button>
          </div>

          {isPasswordChanging && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nové heslo
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t("enterNewPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Potvrďte nové heslo
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Potvrďte nové heslo"
                />
              </div>
            </div>
          )}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Zrušit
          </button>
          <button
            onClick={handleProfileUpdate}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Ukládání...
              </>
            ) : (
              "Uložit změny"
            )}
          </button>
        </div>

        {/* Password Change Button */}
        {isPasswordChanging && (
          <button
            onClick={handlePasswordChange}
            disabled={loading}
            className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-lg font-medium hover:from-emerald-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("changingPassword")}...
              </>
            ) : (
              t("changePassword")
            )}
          </button>
        )}
      </div>
    </Modal>
  );
} 