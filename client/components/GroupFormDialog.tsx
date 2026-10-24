import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatAmountGrouping, onTypedFormat } from "@/lib/format";

export type GroupDraft = {
  name: string;
  price: string;
};

type GroupFormDialogProps = {
  open: boolean;
  editing: boolean;
  draft: GroupDraft;
  error: string;
  saving: boolean;
  onDraftChange: (draft: GroupDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function GroupFormDialog({
  open,
  editing,
  draft,
  error,
  saving,
  onDraftChange,
  onOpenChange,
  onSubmit,
}: GroupFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Guruhni tahrirlash" : "Guruh qoʻshish"}
          </DialogTitle>
          <DialogDescription>
            Guruh oʻylik summasi guruhga qarab belgilanadi.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="g-name">Nomi</Label>
            <Input
              id="g-name"
              required
              className="h-11 sm:h-9"
              value={draft.name}
              onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-price">Oylik toʻlov</Label>
            <Input
              id="g-price"
              type="text"
              inputMode="numeric"
              required
              placeholder="250 000"
              className="h-11 sm:h-9"
              value={draft.price}
              onChange={onTypedFormat(formatAmountGrouping, (price) =>
                onDraftChange({ ...draft, price }),
              )}
            />
            <p className="text-xs text-muted-foreground">
              Oylik toʻlov faqat guruhda belgilanadi.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Bekor qilish
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saqlanmoqda…" : "Saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
