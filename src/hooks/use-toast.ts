// Compatibility shim: shadcn-style toast({title, description, variant}) on top of sonner.
import { toast as sonnerToast } from "sonner";

type ToastArgs = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function toast({ title, description, variant }: ToastArgs) {
  const message = title ?? description ?? "";
  const opts = title && description ? { description } : undefined;
  if (variant === "destructive") return sonnerToast.error(message, opts);
  return sonnerToast(message, opts);
}

export function useToast() {
  return { toast };
}
