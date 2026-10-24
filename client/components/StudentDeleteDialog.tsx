import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Student } from "@/lib/api";

type StudentDeleteDialogProps = {
  student: Student | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function StudentDeleteDialog({
  student,
  deleting,
  onClose,
  onConfirm,
}: StudentDeleteDialogProps) {
  return (
    <Dialog
      open={student !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>«{student?.name}» oʻchirilsinmi?</DialogTitle>
          <DialogDescription>
            Bu oʻquvchining barcha toʻlov yozuvlari ham oʻchiriladi. Bu amalni
            qaytarish mumkin emas.
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
