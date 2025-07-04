import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface UserInfo {
  id: string;
  email: string;
  role?: string;
  name?: string;
}

export function useUser() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        // auth.users에서 현재 로그인한 사용자 정보 가져오기
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          setUser(null);
          return;
        }

        // public.users에서 추가 정보 가져오기
        const { data, error } = await supabase.from("users").select("*").eq("id", authUser.id).single();

        if (error) {
          console.error("사용자 정보를 가져오는데 실패했습니다:", error);
          setUser(null);
        } else {
          setUser({
            id: data.id,
            email: data.email,
            role: data.role,
            name: data.name,
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

    // auth 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
      } else if (session?.user) {
        fetchUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, isLoading };
}
