import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/app/components/ui/Modal";

interface EditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newText: string) => void;
  initialText: string;
}

export const EditNoteModal: React.FC<EditNoteModalProps> = ({ isOpen, onClose, onSave, initialText }) => {
  const [noteText, setNoteText] = useState(initialText);

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
      title="Upravit poznámku"
      maxWidth="sm"
    >
      <div className="flex flex-col gap-4">
        <textarea
          className="w-full p-2 border rounded"
          rows={4}
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder="Upravte poznámku..."
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Zrušit</Button>
          <Button onClick={handleSave}>Uložit</Button>
        </div>
      </div>
    </Modal>
  );
};
