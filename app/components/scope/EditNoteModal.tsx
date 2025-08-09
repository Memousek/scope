import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/app/components/ui/Modal";
import { FiEdit } from "react-icons/fi";
import { useTranslation } from "@/lib/translation";

interface EditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newText: string) => void;
  initialText: string;
}

export const EditNoteModal: React.FC<EditNoteModalProps> = ({ isOpen, onClose, onSave, initialText }) => {
  const [noteText, setNoteText] = useState(initialText);
  const { t } = useTranslation();

  const handleSave = () => {
    if (noteText.trim()) {
      onSave(noteText);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("editNote")}
      maxWidth="sm"
      icon={<FiEdit />}
    >
      <div className="flex flex-col gap-4">
        <textarea
          className="w-full p-2 border rounded"
          rows={4}
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder={t("editNotePlaceholder")}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{t("cancel")}</Button>
          <Button onClick={handleSave}>{t("save")}</Button>
        </div>
      </div>
    </Modal>
  );
};
