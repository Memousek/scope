
import React, { useState } from "react";
import { User } from "@/lib/domain/models/user.model";
import { Button } from "@/components/ui/button";
import { Modal } from "@/app/components/ui/Modal";

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: { text: string; author: User; createdAt: string; updatedAt: string }) => void;
  currentUser: User;
}


export const AddNoteModal: React.FC<AddNoteModalProps> = ({ isOpen, onClose, onSave, currentUser }) => {
  const [noteText, setNoteText] = useState("");

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
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Přidat poznámku"
      maxWidth="sm"
    >
      <div className="flex flex-col gap-4">
        <textarea
          className="w-full p-2 border rounded"
          rows={4}
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder="Napište poznámku..."
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Zrušit</Button>
          <Button onClick={handleSave}>Uložit</Button>
        </div>
      </div>
    </Modal>
  );
};
