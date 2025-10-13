import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PostStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: PostStatus;
  className?: string;
}

export const statusConfig: Record<
  PostStatus,
  { label: string; className: string; dotClassName: string }
> = {
  draft: {
    label: "Rascunho",
    className: "bg-gray-100 text-gray-800 border-gray-300",
    dotClassName: "bg-gray-400",
  },
  pending: {
    label: "Pendente",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300",
    dotClassName: "bg-yellow-500",
  },
  approved: {
    label: "Aprovado",
    className: "bg-green-100 text-green-800 border-green-300",
    dotClassName: "bg-green-500",
  },
  rejected: {
    label: "Rejeitado",
    className: "bg-red-100 text-red-800 border-red-300",
    dotClassName: "bg-red-500",
  },
  published: {
    label: "Publicado",
    className: "bg-blue-100 text-blue-800 border-blue-300",
    dotClassName: "bg-blue-500",
  },
  refactor: {
    label: "Em Refação",
    className: "bg-orange-100 text-orange-800 border-orange-300",
    dotClassName: "bg-orange-500",
  },
  late_approved: {
    label: "Aprovado (Atraso)",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300",
    dotClassName: "bg-yellow-500",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <Badge
      variant="outline"
      className={cn("font-semibold", config.className, className)}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn("h-2 w-2 rounded-full", config.dotClassName)}
        ></span>
        <span>{config.label}</span>
      </div>
    </Badge>
  );
}
