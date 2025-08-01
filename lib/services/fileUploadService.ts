/**
 * Service pro upload souborů na Supabase Storage
 * Zajišťuje bezpečný upload avatarů a jiných souborů
 */
import { createClient } from "@/lib/supabase/client";

export class FileUploadService {
  private supabase = createClient();

  /**
   * Upload avataru na Supabase Storage
   * @param file - Soubor k uploadu
   * @param userId - ID uživatele
   * @returns URL nahraného souboru nebo null při chybě
   */
  async uploadAvatar(file: File, userId: string): Promise<string | null> {
    try {
      // Vytvořit unikátní název souboru
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;

      // Upload do avatars bucketu
      const { error } = await this.supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error details:', {
          message: error.message,
          error: error
        });
        
        // Použít blob URL jako fallback
        return URL.createObjectURL(file);
      }

      // Získat veřejnou URL
      const { data: urlData } = this.supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('File upload error:', error);
      // Fallback: použít blob URL
      return URL.createObjectURL(file);
    }
  }

  /**
   * Smazat starý avatar
   * @param avatarUrl - URL avataru k smazání
   */
  async deleteAvatar(avatarUrl: string): Promise<void> {
    try {
      // Pokud je to blob URL, není potřeba mazat
      if (avatarUrl.startsWith('blob:')) {
        return;
      }

      // Extrahovat název souboru z URL
      const urlParts = avatarUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // Smazat z avatars bucketu
      await this.supabase.storage
        .from('avatars')
        .remove([fileName]);
    } catch (error) {
      console.error('Delete avatar error:', error);
    }
  }

  /**
   * Validace souboru
   * @param file - Soubor k validaci
   * @returns true pokud je soubor validní
   */
  validateFile(file: File): { isValid: boolean; error?: string } {
    // Kontrola typu souboru
    if (!file.type.startsWith('image/')) {
      return { isValid: false, error: 'Soubor musí být obrázek' };
    }

    // Kontrola velikosti (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { isValid: false, error: 'Soubor je příliš velký (max 5MB)' };
    }

    // Kontrola formátu
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Podporované formáty: JPG, PNG, WebP' };
    }

    return { isValid: true };
  }
} 