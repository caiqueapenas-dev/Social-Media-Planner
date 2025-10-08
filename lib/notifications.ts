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

  if (!client) return;

  await createNotification({
    userId: client.user_id,
    title: "Novo Post para Revisão",
    message: "Um novo post está aguardando sua aprovação",
    link: "/client/dashboard",
  });
}

export async function notifyNewInsight(clientId: string, createdBy: string) {
  const supabase = createClient();

  const { data: creator } = await supabase
    .from("users")
    .select("role, full_name")
    .eq("id", createdBy)
    .single();

  if (!creator) return;

  if (creator.role === "admin") {
    // Notify client
    const { data: client } = await supabase
      .from("clients")
      .select("user_id")
      .eq("id", clientId)
      .single();

    if (client) {
      await createNotification({
        userId: client.user_id,
        title: "Nova Ideia Compartilhada",
        message: `${creator.full_name} compartilhou uma nova ideia`,
        link: "/client/insights",
      });
    }
  } else {
    // Notify all admins
    const { data: admins } = await supabase
      .from("users")
      .select("id")
      .eq("role", "admin");

    if (admins) {
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          title: "Nova Ideia do Cliente",
          message: `${creator.full_name} compartilhou uma nova ideia`,
          link: "/admin/insights",
        });
      }
    }
  }
}

