import { createClient } from "@/lib/supabase/server";
import { AdminLayout } from "@/components/layout/admin-layout";
import { User } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function AdminAppLayout({
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
    .maybeSingle();

  return (
    <AdminLayout initialUser={userData as User | null}>{children}</>
  );
}
