
import React, {  useState } from "react";
import { User } from "@/lib/domain/models/user.model";
import { Button } from "@/components/ui/button";
import { Modal } from "@/app/components/ui/Modal";
import { FiEdit } from "react-icons/fi";
import { useTranslation } from "@/lib/translation";
import { useToastFunctions } from '@/app/components/ui/Toast';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: { text: string; author: User; createdAt: string; updatedAt: string }) => void;
  currentUser: User;
}


export const AddNoteModal: React.FC<AddNoteModalProps> = ({ isOpen, onClose, onSave, currentUser }) => {
  const [noteText, setNoteText] = useState("");
  const { t } = useTranslation();
  const toast = useToastFunctions();

  const handleSave = () => {
    if (noteText.trim()) {
      const now = new Date();
      onSave({
        text: noteText,
        author: currentUser,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      });
      setNoteText("");
      onClose();
      toast.success('Poznámka přidána', 'Poznámka byla úspěšně přidána k projektu.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("addNote")}
      maxWidth="sm"
      icon={<FiEdit />}
    >
      <div className="flex flex-col gap-4">
        <textarea
          className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-200 min-h-20"
          rows={4}
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder={t("writeNote")}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{t("cancel")}</Button>
          <Button onClick={handleSave}>{t("save")}</Button>
        </div>
      </div>
    </Modal>
  );
};
