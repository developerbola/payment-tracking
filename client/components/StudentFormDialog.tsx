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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Group } from "@/lib/api";
import { formatMoney, formatPhoneLocal, onTypedFormat } from "@/lib/format";

export type StudentDraft = {
  name: string;
  phone: string;
  groupId: string;
};

type StudentFormDialogProps = {
  open: boolean;
  editing: boolean;
  groups: Group[] | null;
  draft: StudentDraft;
  error: string;
  saving: boolean;
  onDraftChange: (draft: StudentDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function StudentFormDialog({
  open,
  editing,
  groups,
  draft,
  error,
  saving,
  onDraftChange,
  onOpenChange,
  onSubmit,
}: StudentFormDialogProps) {
  const selectedGroup = groups?.find((group) => group.id === draft.groupId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Oʻquvchini tahrirlash" : "Oʻquvchi qoʻshish"}
          </DialogTitle>
          <DialogDescription>
            Oylik summa butun son sifatida saqlanadi
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Ism</Label>
            <Input
              id="s-name"
              required
              className="h-11 sm:h-9"
              value={draft.name}
              onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-phone">Telefon raqam</Label>
            <div className="flex h-11 w-full items-stretch overflow-hidden rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 sm:h-9 dark:bg-input/30">
              <span
                aria-hidden="true"
                className="flex shrink-0 select-none items-center border-r border-input bg-muted px-3 text-sm text-muted-foreground"
              >
                +998
              </span>
              <Input
                id="s-phone"
                type="tel"
                inputMode="tel"
                required
                className="h-auto flex-1 rounded-none border-0 bg-transparent px-3 py-0 focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
                placeholder="90 123 45 67"
                value={draft.phone}
                onChange={onTypedFormat(formatPhoneLocal, (phone) =>
                  onDraftChange({ ...draft, phone }),
                )}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-group">Guruh</Label>
            <Select
              required
              value={groups ? draft.groupId : ""}
              onValueChange={(value) =>
                onDraftChange({ ...draft, groupId: `${value}` })
              }
              disabled={!groups}
              items={(groups ?? []).map((group) => ({
                value: group.id,
                label: group.name,
              }))}
            >
              <SelectTrigger id="s-group" className="w-full h-11 sm:h-9">
                <SelectValue
                  placeholder={groups ? "Guruhni tanlang…" : "Yuklanmoqda…"}
                />
              </SelectTrigger>
              <SelectContent>
                {(groups ?? []).map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedGroup && (
              <p className="text-xs text-muted-foreground">
                Oylik toʻlov: {formatMoney(selectedGroup.price)} soʻm
              </p>
            )}
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
