import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/DataTable";
import { GroupDeleteDialog } from "@/components/GroupDeleteDialog";
import { GroupFormDialog, type GroupDraft } from "@/components/GroupFormDialog";
import { Pagination } from "@/components/Pagination";
import { api, type Group } from "@/lib/api";
import {
  debtorsPageCacheAtom,
  groupsAtom,
  groupsPageCacheAtom,
  studentsAtom,
  studentsPageCacheAtom,
  studentsVersionAtom,
} from "@/lib/atoms";
import {
  digitsOnly,
  formatAmountGrouping,
  formatMoney,
  onTypedFormat,
} from "@/lib/format";

const emptyDraft = (): GroupDraft => ({ name: "", price: "" });

const PAGE_SIZE = 12;

export default function GroupsPage() {
  const [, setGroups] = useAtom(groupsAtom);
  const [pageCache, setGroupPageCache] = useAtom(groupsPageCacheAtom);
  const [, setStudentPageCache] = useAtom(studentsPageCacheAtom);
  const [, setDebtorPageCache] = useAtom(debtorsPageCacheAtom);
  const [, setStudents] = useAtom(studentsAtom);
  const [, setStudentsVersion] = useAtom(studentsVersionAtom);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [debouncedMinPrice, setDebouncedMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState("");
  const queryKey = JSON.stringify({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    minPrice: debouncedMinPrice,
    maxPrice: debouncedMaxPrice,
  });
  const [loadError, setLoadError] = useState<{ key: string; message: string } | null>(null);
  const result = pageCache[queryKey] ?? null;
  const error = loadError?.key === queryKey ? loadError.message : "";
  const loading = result === null && !error;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<GroupDraft>(emptyDraft());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Group | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setDebouncedMinPrice(digitsOnly(minPrice));
      setDebouncedMaxPrice(digitsOnly(maxPrice));
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search, minPrice, maxPrice]);

  useEffect(() => {
    let cancelled = false;
    const cached = pageCache[queryKey];
    if (cached) return;
    api
      .listGroups({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        minPrice: debouncedMinPrice ? Number(debouncedMinPrice) : undefined,
        maxPrice: debouncedMaxPrice ? Number(debouncedMaxPrice) : undefined,
      })
      .then((data) => {
        if (cancelled) return;
        if (data.items.length === 0 && data.total > 0 && page > 1) {
          setPage(data.totalPages);
          return;
        }
        setGroupPageCache((cache) => ({ ...cache, [queryKey]: data }));
        setLoadError((current) => current?.key === queryKey ? null : current);
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError({
            key: queryKey,
            message: err instanceof Error ? err.message : "Guruhlarni yuklashda xatolik",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [
    page,
    debouncedSearch,
    debouncedMinPrice,
    debouncedMaxPrice,
    queryKey,
    pageCache,
    setGroupPageCache,
  ]);

  const refreshSharedCache = () =>
    api
      .listGroups({ page: 1, limit: 1000 })
      .then((data) => setGroups(data.items))
      .catch(() => {});

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (group: Group) => {
    setEditingId(group.id);
    setDraft({
      name: group.name,
      price: formatAmountGrouping(`${group.price}`, false),
    });
    setFormError("");
    setDialogOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const body = {
      name: draft.name.trim(),
      price: Number(digitsOnly(draft.price)),
    };
    if (!body.price || body.price < 1) {
      setFormError("Oylik summani kiriting");
      return;
    }
    setSaving(true);
    try {
      if (editingId === null) {
        await api.createGroup(body);
        toast.success(`«${body.name}» qoʻshildi`);
      } else {
        await api.updateGroup(editingId, body);
        toast.success(`«${body.name}» yangilandi`);
      }
      setDialogOpen(false);
      setGroupPageCache({});
      setStudentPageCache({});
      setDebtorPageCache({});
      setStudents(null);
      setStudentsVersion((v) => v + 1);
      refreshSharedCache();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Guruhni saqlashda xatolik",
      );
    } finally {
      setSaving(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await api.deleteGroup(deleting.id);
      toast.success(`«${deleting.name}» oʻchirildi`);
      setDeleting(null);
      setGroupPageCache({});
      setStudentPageCache({});
      setDebtorPageCache({});
      setStudents(null);
      setStudentsVersion((v) => v + 1);
      refreshSharedCache();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Guruhni oʻchirishda xatolik",
      );
    } finally {
      setDeletingBusy(false);
    }
  };

  const columns: Column<Group>[] = [
    { id: "name", header: "Nomi", cell: (row) => row.name },
    {
      id: "price",
      header: "Oylik toʻlov",
      cell: (row) => formatMoney(row.price),
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
        <h2 className="text-lg font-semibold tracking-tight">Guruhlar</h2>
        <Button className="shrink-0" onClick={openCreate}>
          <PlusIcon />
          Guruh qoʻshish
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Guruh nomi boʻyicha qidirish…"
          className="h-11 sm:h-9 sm:flex-1 w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2">
          <Input
            placeholder="Summa dan…"
            aria-label="Eng kam oylik toʻlov"
            type="text"
            inputMode="numeric"
            className="h-11 sm:h-9 sm:w-40"
            value={minPrice}
            onChange={onTypedFormat(formatAmountGrouping, setMinPrice)}
          />
          <Input
            placeholder="Summa gacha…"
            aria-label="Eng koʻp oylik toʻlov"
            type="text"
            inputMode="numeric"
            className="h-11 sm:h-9 sm:w-40"
            value={maxPrice}
            onChange={onTypedFormat(formatAmountGrouping, setMaxPrice)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!error && (
        <>
          <DataTable
            data={result?.items ?? []}
            columns={columns}
            loading={loading}
            emptyMessage={
              debouncedSearch || debouncedMinPrice || debouncedMaxPrice
                ? "Hech narsa topilmadi"
                : "Hozircha guruh yoʻq — birinchisini qoʻshing"
            }
          />
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Jami {result?.total ?? 0} guruh
            </p>
            <Pagination
              page={result?.page ?? page}
              totalPages={result?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      <GroupFormDialog
        open={dialogOpen}
        editing={editingId !== null}
        draft={draft}
        error={formError}
        saving={saving}
        onDraftChange={setDraft}
        onOpenChange={setDialogOpen}
        onSubmit={onSubmit}
      />
      <GroupDeleteDialog
        group={deleting}
        deleting={deletingBusy}
        onClose={() => setDeleting(null)}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
