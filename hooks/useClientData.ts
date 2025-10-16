"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

export function useClientData() {
  const supabase = createClient();
  const { user } = useAuthStore();
  const [clientId, setClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadClientData() {
      if (user) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (clientData) {
          setClientId(clientData.id);
        }
        setIsLoading(false);
      }
    }

    loadClientData();
  }, [user, supabase]);

  return { clientId, isLoading };
}
