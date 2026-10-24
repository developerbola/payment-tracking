import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonthSelect } from "@/components/MonthSelect";
import { api } from "@/lib/api";
import { studentsAtom } from "@/lib/atoms";
import {
  currentMonth,
  digitsOnly,
  formatAmountGrouping,
  formatMoney,
  onTypedFormat,
} from "@/lib/format";

type PaymentDialogProps = {
  presetStudentId?: string | null;
  onFinish: (payment: { studentId: string }) => void;
  onDismiss: () => void;
};

export default function PaymentDialog({
  presetStudentId = null,
  onFinish,
  onDismiss,
}: PaymentDialogProps) {
  const [students, setStudents] = useAtom(studentsAtom);
  const [studentId, setStudentId] = useState(`${presetStudentId ?? ""}`);
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (students !== null) return;
    let cancelled = false;
    api
      .listStudents({ page: 1, limit: 1000 })
      .then((data) => {
        if (!cancelled) setStudents(data.items);
      })
      .catch((err) => {
        if (!cancelled)
          setMessage(
            `${err instanceof Error ? err.message : "Oʻquvchilarni yuklashda xatolik"}`,
          );
      });
    return () => {
      cancelled = true;
    };
  }, [students, setStudents]);

  const selected = students?.find((s) => `${s.id}` === studentId);
  const sortedStudents = students
    ? [...students].sort(
        (a, b) =>
          a.group.localeCompare(b.group, "uz", { sensitivity: "base" }) ||
          a.name.localeCompare(b.name, "uz", { sensitivity: "base" }),
      )
    : null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (!studentId) return setMessage("Oʻquvchini tanlang");
    const amountDigits = digitsOnly(amount);
    if (!amountDigits) return setMessage("Summani kiriting");
    setSubmitting(true);
    try {
      await api.createPayment(studentId, {
        amount: Number(amountDigits),
        month,
      });
      toast.success("Toʻlov qoʻshildi", {
        description:
          selected &&
          `${selected.name}: ${formatMoney(Number(amountDigits))}, ${month}`,
      });
      onFinish({ studentId });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Toʻlov qoʻshishda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Toʻlov qoʻshish</DialogTitle>
          <DialogDescription>
            Toʻlov qaysi oy uchun hisoblanishini tanlang.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="student">Oʻquvchi</Label>
            <Select
              value={students ? studentId : ""}
              onValueChange={(value) => setStudentId(`${value}`)}
              disabled={!students}
              items={sortedStudents?.map((student) => ({
                value: `${student.id}`,
                label: `${student.name} · ${student.group}`,
              }))}
            >
              <SelectTrigger id="student" className="w-full h-11 sm:h-9">
                <SelectValue placeholder={students ? "Oʻquvchini tanlang…" : "Yuklanmoqda…"} />
              </SelectTrigger>
              <SelectContent>
                {sortedStudents?.map((student) => (
                  <SelectItem key={student.id} value={`${student.id}`}>
                    <span className="flex w-full items-center gap-3">
                      <span className="min-w-0 flex-1 truncate">{student.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {student.group}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Summa</Label>
            <Input
              id="amount"
              type="text"
              inputMode="numeric"
              required
              placeholder="250 000"
              className="h-11 sm:h-9"
              value={amount}
              onChange={onTypedFormat(formatAmountGrouping, setAmount)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-month">Oy</Label>
            <MonthSelect
              id="payment-month"
              value={month}
              onChange={setMonth}
              className="h-11 w-full justify-between font-normal sm:h-9"
            />
          </div>

          {message && <p className="text-sm text-destructive">{message}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDismiss}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Qoʻshilmoqda…" : "Toʻlov qoʻshish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
