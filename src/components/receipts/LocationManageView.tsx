"use client";

import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import LocationFormDialog from "./LocationFormDialog";
import LocationItemMenu from "./LocationItemMenu";

interface LocationManageViewProps {
  onBack: () => void;
  onSelect: (location: string) => void;
}

interface Location {
  id: string;
  name: string;
}

export default function LocationManageView({ onBack, onSelect }: LocationManageViewProps) {
  const [locations, setLocations] = useState<Location[]>([
    { id: "1", name: "A 창고" },
    { id: "2", name: "B 창고" },
    { id: "3", name: "C 창고" },
  ]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const handleAdd = (name: string) => {
    const newLocation = {
      id: Date.now().toString(),
      name,
    };
    setLocations([...locations, newLocation]);
    setIsFormOpen(false);
  };

  const handleEdit = (id: string) => {
    const location = locations.find((loc) => loc.id === id);
    if (location) {
      setEditingLocation(location);
    }
  };

  const handleUpdate = (name: string) => {
    if (editingLocation) {
      setLocations(locations.map((loc) => (loc.id === editingLocation.id ? { ...loc, name } : loc)));
      setEditingLocation(null);
    }
  };

  const handleDelete = (id: string) => {
    setLocations(locations.filter((location) => location.id !== id));
  };

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold">위치 선택</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-5 h-5 text-orange-500" />
        </Button>
      </div>

      {/* 위치 목록 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {locations.map((location) => (
            <div
              key={location.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent hover:text-accent-foreground"
            >
              <button className="flex-1 text-left" onClick={() => onSelect(location.name)}>
                {location.name}
              </button>
              <LocationItemMenu onEdit={() => handleEdit(location.id)} onDelete={() => handleDelete(location.id)} />
            </div>
          ))}
        </div>
      </div>

      {/* 위치 추가/수정 다이얼로그 */}
      <LocationFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} onSubmit={handleAdd} mode="add" />
      <LocationFormDialog
        open={!!editingLocation}
        onOpenChange={(open) => !open && setEditingLocation(null)}
        onSubmit={handleUpdate}
        initialValue={editingLocation?.name}
        mode="edit"
      />
    </div>
  );
}
