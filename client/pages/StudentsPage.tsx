import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/DataTable";
import { StudentDeleteDialog } from "@/components/StudentDeleteDialog";
import {
  StudentFormDialog,
  type StudentDraft,
} from "@/components/StudentFormDialog";
import { Pagination } from "@/components/Pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type Student } from "@/lib/api";
import {
  debtorsPageCacheAtom,
  groupsAtom,
  studentsAtom,
  studentsPageCacheAtom,
  studentsVersionAtom,
} from "@/lib/atoms";
import {
  digitsOnly,
  formatMoney,
  formatPhone,
  formatPhoneLocal,
} from "@/lib/format";

const emptyDraft = (): StudentDraft => ({
  name: "",
  phone: "",
  groupId: "",
});

const PAGE_SIZE = 12;
const ALL_GROUPS = "all";

export default function StudentsPage() {
  const [groups, setGroups] = useAtom(groupsAtom);
  const [studentCache, setStudentCache] = useAtom(studentsPageCacheAtom);
  const [, setDebtorCache] = useAtom(debtorsPageCacheAtom);
  const [, setAllStudents] = useAtom(studentsAtom);
  const [, setStudentsVersion] = useAtom(studentsVersionAtom);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState(ALL_GROUPS);
  const queryKey = JSON.stringify({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    groupId: groupFilter === ALL_GROUPS ? "" : groupFilter,
  });
  const [loadError, setLoadError] = useState<{ key: string; message: string } | null>(null);
  const result = studentCache[queryKey] ?? null;
  const error = loadError?.key === queryKey ? loadError.message : "";
  const loading = result === null && !error;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StudentDraft>(emptyDraft());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const cached = studentCache[queryKey];
    if (cached) return;
    api
      .listStudents({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        groupId: groupFilter === ALL_GROUPS ? undefined : groupFilter,
      })
      .then((data) => {
        if (cancelled) return;
        if (data.items.length === 0 && data.total > 0 && page > 1) {
          setPage(data.totalPages);
          return;
        }
        setStudentCache((cache) => ({ ...cache, [queryKey]: data }));
        setLoadError((current) => current?.key === queryKey ? null : current);
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError({
            key: queryKey,
            message: err instanceof Error
              ? err.message
              : "Oʻquvchilarni yuklashda xatolik",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, groupFilter, queryKey, studentCache, setStudentCache]);

  useEffect(() => {
    if (groups !== null) return;
    let cancelled = false;
    api
      .listGroups({ page: 1, limit: 1000 })
      .then((data) => {
        if (!cancelled) setGroups(data.items);
      })
      .catch((err) => {
        console.error(err);
      });
    return () => {
      cancelled = true;
    };
  }, [groups, setGroups]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditingId(student.id);
    setDraft({
      name: student.name,
      phone: formatPhoneLocal(student.phone, false),
      groupId: student.groupId,
    });
    setFormError("");
    setDialogOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const localDigits = digitsOnly(draft.phone);
    if (localDigits.length > 0 && localDigits.length !== 9) {
      setFormError("Telefon raqam 9 ta raqamdan iborat boʻlishi kerak");
      return;
    }
    if (!draft.groupId) {
      setFormError("Guruhni tanlang");
      return;
    }
    const body = {
      name: draft.name.trim(),
      phone: localDigits ? `+998 ${formatPhoneLocal(localDigits)}` : "-",
      groupId: draft.groupId,
    };
    setSaving(true);
    try {
      if (editingId === null) {
        await api.createStudent(body);
        toast.success(`«${body.name}» qoʻshildi`);
        const nextTotal = (result?.total ?? 0) + 1;
        setPage(Math.max(1, Math.ceil(nextTotal / PAGE_SIZE)));
      } else {
        await api.updateStudent(editingId, body);
        toast.success(`«${body.name}» yangilandi`);
      }
      setDialogOpen(false);
      setStudentCache({});
      setDebtorCache({});
      setAllStudents(null);
      setStudentsVersion((version) => version + 1);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Oʻquvchini saqlashda xatolik",
      );
    } finally {
      setSaving(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await api.deleteStudent(deleting.id);
      toast.success(`«${deleting.name}» oʻchirildi`);
      setDeleting(null);
      setStudentCache({});
      setDebtorCache({});
      setAllStudents(null);
      setStudentsVersion((version) => version + 1);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Oʻquvchini oʻchirishda xatolik",
      );
    } finally {
      setDeletingBusy(false);
    }
  };

  const columns: Column<Student>[] = [
    { id: "name", header: "Ism", cell: (row) => row.name },
    { id: "group", header: "Guruh", cell: (row) => row.group },
    { id: "phone", header: "Telefon", cell: (row) => formatPhone(row.phone) },
    {
      id: "monthlyAmount",
      header: "Oylik to'lov",
      cell: (row) => formatMoney(row.monthlyAmount),
    },
    {
      id: "actions",
      header: "",
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            onClick={() => openEdit(row)}
          >
            Tahrirlash
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-9"
            onClick={() => setDeleting(row)}
          >
            Oʻchirish
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Oʻquvchilar</h2>
        <Button className="shrink-0" onClick={openCreate}>
          <PlusIcon />
          Oʻquvchi qoʻshish
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Ism boʻyicha qidirish…"
          className="h-11 sm:h-9 sm:flex-1 w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={groupFilter}
          onValueChange={(value) => {
            setGroupFilter(`${value}`);
            setPage(1);
          }}
          items={[
            { value: ALL_GROUPS, label: "Barcha guruhlar" },
            ...(groups ?? []).map((g) => ({ value: g.id, label: g.name })),
          ]}
        >
          <SelectTrigger
            aria-label="Guruh boʻyicha filtrlash"
            className="h-11 sm:h-9 sm:w-56"
          >
            <SelectValue placeholder="Guruh" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_GROUPS}>Barcha guruhlar</SelectItem>
            {(groups ?? []).map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!error && (
        <>
          <DataTable
            data={result?.items ?? []}
            columns={columns}
            loading={loading}
            emptyMessage={
              debouncedSearch
                ? "Hech narsa topilmadi"
                : "Hozircha oʻquvchi yoʻq — birinchisini qoʻshing"
            }
          />
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Jami {result?.total ?? 0} oʻquvchi
            </p>
            <Pagination
              page={result?.page ?? page}
              totalPages={result?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      <StudentFormDialog
        open={dialogOpen}
        editing={editingId !== null}
        groups={groups}
        draft={draft}
        error={formError}
        saving={saving}
        onDraftChange={setDraft}
        onOpenChange={setDialogOpen}
        onSubmit={onSubmit}
      />
      <StudentDeleteDialog
        student={deleting}
        deleting={deletingBusy}
        onClose={() => setDeleting(null)}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
