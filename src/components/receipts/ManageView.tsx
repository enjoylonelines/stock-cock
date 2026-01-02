"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import LocationFormDialog from "./LocationFormDialog";
import LocationItemMenu from "./LocationItemMenu";

interface ManageViewProps<T extends { id: string; name: string }> {
  onBack: () => void;
  onSelect: (item: T) => void;
  title: string;
  items: T[];
  onAdd?: (name: string) => void;
  onEdit?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
}

const ManageView = <T extends { id: string; name: string }>({
  onBack,
  onSelect,
  title,
  items,
  onAdd,
  onEdit,
  onDelete,
}: ManageViewProps<T>) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);

  const handleAdd = (name: string) => {
    if (!onAdd) return;
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
    if (editingItem && onEdit) {
      onEdit(editingItem.id, name);
      setEditingItem(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex gap-2 items-center">
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
      <div className="overflow-y-auto flex-1">
        <div className="p-4 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center p-3 rounded-lg border hover:bg-accent hover:text-accent-foreground"
            >
              <button type="button" className="flex-1 text-left" onClick={() => onSelect(item)}>
                {item.name}
              </button>
              <LocationItemMenu
                onEdit={() => handleEdit(item.id)}
                onDelete={async () => {
                  if (!onDelete) return;
                  try {
                    await onDelete(item.id);
                  } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "삭제 중 오류가 발생했습니다.";
                    alert(errorMessage);
                  }
                }}
              />
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
};

export default ManageView;
