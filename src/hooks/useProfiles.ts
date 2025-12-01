"use client";

import useSWR, { mutate } from "swr";
import { createClient } from "@/utils/supabase/client";

interface Profile {
  id: string;
  name: string;
  email?: string;
}

const fetcher = async () => {
  const supabase = createClient();
  const { data, error } = await supabase.from("profiles").select("id, name").order("name");
  if (error) throw error;
  return (data || []) as Profile[];
};

export function useProfiles() {
  const { data: profiles = [], isLoading: loading, error } = useSWR<Profile[]>("profiles", fetcher, {
    revalidateOnFocus: false,
  });

  const addProfile = async (name: string, email?: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.from("profiles").insert([{ name }]).select().single();
    if (error) throw error;
    await mutate("profiles", (current: Profile[] = []) => [...current, data], false);
    return data;
  };

  const editProfile = async (id: string, name: string, email?: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.from("profiles").update({ name, email }).eq("id", id).select().single();
    if (error) throw error;
    await mutate("profiles", (current: Profile[] = []) => current.map((profile) => (profile.id === id ? data : profile)), false);
    return data;
  };

  const deleteProfile = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) throw error;
    await mutate("profiles", (current: Profile[] = []) => current.filter((profile) => profile.id !== id), false);
  };

  return {
    profiles,
    loading,
    error,
    addProfile,
    editProfile,
    deleteProfile,
    refetch: () => mutate("profiles"),
  };
}
