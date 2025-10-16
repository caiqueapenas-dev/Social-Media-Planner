import { createClient } from "@/lib/supabase/server";
import { ClientLayout } from "@/components/layout/client-layout";
import { User } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function ClientAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  return (
    <ClientLayout initialUser={userData as User | null}>
      {children}
    </ClientLayout>
  );
}
