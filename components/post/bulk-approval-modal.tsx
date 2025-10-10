"use client";

import { useState } from "react";
import { Post } from "@/lib/types";
import { PostViewModal } from "./post-view-modal";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import toast from "react-hot-toast";

interface BulkApprovalModalProps {
  posts: Post[];
  isOpen: boolean;
  onClose: () => void;
  onFinish: () => void;
}

export function BulkApprovalModal({
  posts,
  isOpen,
  onClose,
  onFinish,
}: BulkApprovalModalProps) {
  const supabase = createClient();
  const { user } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < posts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onFinish(); // Fecha o modal quando todos os posts forem revisados
    }
  };

  const handleApprove = async (post: Post) => {
    const scheduledDate = new Date(post.scheduled_date);
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    const newStatus =
      scheduledDate < tenMinutesFromNow ? "late_approved" : "approved";

    const { error } = await supabase
      .from("posts")
      .update({ status: newStatus })
      .eq("id", post.id);

    if (error) {
      toast.error("Erro ao aprovar post. Tente novamente.");
      return; // Impede de avançar para o próximo post
    }

    toast.success("Post aprovado!", { duration: 1500 });
    handleNext();
  };

  const handleRequestAlteration = async (post: Post, alteration: string) => {
    if (!alteration.trim()) {
      toast.error("Por favor, descreva a alteração necessária.");
      return;
    }
    const { error } = await supabase
      .from("posts")
      .update({ status: "refactor" })
      .eq("id", post.id);

    if (error) {
      toast.error("Erro ao solicitar alteração. Tente novamente.");
      return; // Impede de avançar para o próximo post
    }

    await supabase.from("post_comments").insert({
      post_id: post.id,
      user_id: user?.id,
      content: alteration,
      type: "alteration_request",
      status: "pending",
    });

    toast.success("Alteração solicitada!", { duration: 1500 });
    handleNext();
  };

  const currentPost = posts[currentIndex];

  if (!currentPost) {
    return null;
  }

  return (
    <PostViewModal
      post={currentPost}
      isOpen={isOpen}
      onClose={onClose}
      onApprove={handleApprove}
      onRefactor={handleRequestAlteration}
      showEditButton={false}
      // Adicionamos um título dinâmico para mostrar o progresso
      title={`Revisão em Massa: Post ${currentIndex + 1} de ${posts.length}`}
    />
  );
}
