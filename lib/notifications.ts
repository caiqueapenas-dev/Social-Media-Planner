import { createClient } from "@/lib/supabase/client";

export async function createNotification({
  userId,
  title,
  message,
  link,
}: {
  userId: string;
  title: string;
  message: string;
  link?: string;
}) {
  const supabase = createClient();

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    link,
    is_read: false,
  });

  if (error) {
    console.error("Error creating notification:", error);
  }
}

export async function notifyPostApproved(postId: string, clientId: string) {
  const supabase = createClient();

  // Get admin users
  const { data: admins } = await supabase
    .from("users")
    .select("id")
    .eq("role", "admin");

  if (!admins) return;

  // Get client and post info
  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("id", clientId)
    .single();

  // Notify all admins
  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      title: "Post Aprovado",
      message: `${client?.name} aprovou um post`,
      link: `/admin/calendar`,
    });
  }
}

export async function notifyPostApprovedLate(postId: string, clientId: string) {
  const supabase = createClient();

  const { data: admins } = await supabase
    .from("users")
    .select("id")
    .eq("role", "admin");

  if (!admins) return;

  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("id", clientId)
    .single();

  const message = `${
    client?.name || "Um cliente"
  } aprovou um post atrasado. A publicação precisa ser feita manualmente.`;

  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      title: "Post Aprovado com Atraso",
      message,
      link: `/admin/dashboard`,
    });
  }
}

export async function notifyPostRejected(postId: string, clientId: string) {
  const supabase = createClient();

  const { data: admins } = await supabase
    .from("users")
    .select("id")
    .eq("role", "admin");

  if (!admins) return;

  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("id", clientId)
    .single();

  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      title: "Post Reprovado",
      message: `${client?.name} reprovou um post`,
      link: `/admin/calendar`,
    });
  }
}

export async function notifyNewPost(clientId: string) {
  const supabase = createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("user_id, name")
    .eq("id", clientId)
    .single();

  if (!client?.user_id) return;

  await createNotification({
    userId: client.user_id,
    title: "Novo Post para Revisão",
    message: "Um novo post está aguardando sua aprovação",
    link: "/client/dashboard",
  });
}
