// components/layout/global-search.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Post } from "@/lib/types";
import { Input } from "../ui/input";
import { Modal } from "../ui/modal";
import { PostCard } from "../post/post-card";
import { Search, Loader2 } from "lucide-react";
import { PostViewModal } from "../post/post-view-modal";

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const debounce = <F extends (...args: any[]) => any>(
    func: F,
    delay: number
  ) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<F>): void => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const performSearch = useCallback(
    debounce(async (term: string) => {
      if (term.length < 3) {
        setResults([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const { data } = await supabase
        .from("posts")
        .select(`*, client:clients(*)`)
        .textSearch("caption", term, {
          type: "websearch",
          config: "portuguese",
        })
        .limit(10);

      setResults((data as Post[]) || []);
      setIsLoading(false);
    }, 500),
    []
  );

  useEffect(() => {
    performSearch(searchTerm);
  }, [searchTerm, performSearch]);

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 border rounded-md px-3 py-1.5"
      >
        <Search className="h-4 w-4" />
        Buscar posts...
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Busca Global de Posts"
        size="lg"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Digite palavras-chave da legenda..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
          )}
        </div>
        <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {results.length > 0
            ? results.map((post) => (
                <PostCard key={post.id} post={post} onClick={handlePostClick} />
              ))
            : searchTerm.length >= 3 &&
              !isLoading && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum resultado encontrado.
                </p>
              )}
        </div>
      </Modal>

      {selectedPost && (
        <PostViewModal
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          post={selectedPost}
          onEdit={() => {
            if (selectedPost) {
              router.push(`/admin/posts/edit/${selectedPost.id}`);
              setSelectedPost(null);
            }
          }}
        />
      )}
    </>
  );
}
