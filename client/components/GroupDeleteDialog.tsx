import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Group } from "@/lib/api";

type GroupDeleteDialogProps = {
  group: Group | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function GroupDeleteDialog({
  group,
  deleting,
  onClose,
  onConfirm,
}: GroupDeleteDialogProps) {
  return (
    <Dialog open={group !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>«{group?.name}» oʻchirilsinmi?</DialogTitle>
          <DialogDescription>
            Oʻquvchisi bor guruhni oʻchirish mumkin emas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Oʻchirilmoqda…" : "Oʻchirish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
