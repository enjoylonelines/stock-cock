"use client";

import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import LocationFormDialog from "./LocationFormDialog";
import LocationItemMenu from "./LocationItemMenu";

interface Item {
  id: string;
  name: string;
}

interface ManageViewProps {
  onBack: () => void;
  onSelect: (name: string) => void;
  title: string;
  items: Item[];
  onAdd: (name: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export default function ManageView({ onBack, onSelect, title, items, onAdd, onEdit, onDelete }: ManageViewProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; name: string } | null>(null);

  const handleAdd = (name: string) => {
    onAdd(name);
    setIsFormOpen(false);
  };

  const handleEdit = (id: string) => {
    const item = items.find((item) => item.id === id);
    if (item) {
      setEditingItem(item);
    }
  };

  const handleUpdate = (name: string) => {
    if (editingItem) {
      onEdit(editingItem.id, name);
      setEditingItem(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-5 h-5 text-orange-500" />
        </Button>
      </div>

      {/* 리스트 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent hover:text-accent-foreground"
            >
              <button className="flex-1 text-left" onClick={() => onSelect(item.name)}>
                {item.name}
              </button>
              <LocationItemMenu onEdit={() => handleEdit(item.id)} onDelete={() => onDelete(item.id)} />
            </div>
          ))}
        </div>
      </div>

      {/* 아이템 추가/수정 다이얼로그 */}
      <LocationFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} onSubmit={handleAdd} mode="add" />
      <LocationFormDialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        onSubmit={handleUpdate}
        initialValue={editingItem?.name}
        mode="edit"
      />
    </div>
  );
}
