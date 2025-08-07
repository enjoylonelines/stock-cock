import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface UserInfo {
  id: string;
  name?: string;
  image_url: string;
}

export function useUser() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        // auth.users에서 현재 로그인한 사용자 정보 가져오기
        const { data: session, error: sessionError } = await supabase.auth.getSession();

        if (!session) {
          setUser(null);
          return;
        }
        console.log(session);
        // public.users에서 추가 정보 가져오기
        const { data, error } = await supabase.from("profiles").select("*").eq("id", session.id).single();

        if (error) {
          console.error("사용자 정보를 가져오는데 실패했습니다:", error);
          setUser(null);
        } else {
          setUser({
            id: data.id,
            name: data.name,
            image_url: data.image_url,
          });
        }
      } catch (error) {
        console.error("사용자 정보를 가져오는데 실패했습니다:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, isLoading };
}
