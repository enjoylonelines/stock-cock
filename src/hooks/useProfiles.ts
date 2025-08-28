"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

interface Profile {
  id: string;
  name: string;
  email?: string;
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("profiles").select("id, name").order("name");

      if (error) throw error;

      setProfiles(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로필을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const addProfile = async (name: string, email?: string) => {
    try {
      const { data, error } = await supabase.from("profiles").insert([{ name }]).select().single();

      if (error) throw error;

      setProfiles((prev) => [...prev, data]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로필 추가에 실패했습니다.");
      throw err;
    }
  };

  const editProfile = async (id: string, name: string, email?: string) => {
    try {
      const { data, error } = await supabase.from("profiles").update({ name, email }).eq("id", id).select().single();

      if (error) throw error;

      setProfiles((prev) => prev.map((profile) => (profile.id === id ? data : profile)));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로필 수정에 실패했습니다.");
      throw err;
    }
  };

  const deleteProfile = async (id: string) => {
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", id);

      if (error) throw error;

      setProfiles((prev) => prev.filter((profile) => profile.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로필 삭제에 실패했습니다.");
      throw err;
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return {
    profiles,
    loading,
    error,
    addProfile,
    editProfile,
    deleteProfile,
    refetch: fetchProfiles,
  };
}
