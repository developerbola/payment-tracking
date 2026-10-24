import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PaymentDialog from "@/components/PaymentDialog";
import { MonthSelect } from "@/components/MonthSelect";
import { Pagination } from "@/components/Pagination";
import { DataTable, type Column } from "@/components/DataTable";
import { api, type Debtor } from "@/lib/api";
import {
  debtorsPageCacheAtom,
  groupsAtom,
  monthAtom,
  studentsVersionAtom,
} from "@/lib/atoms";
import { formatMoney, formatPhone } from "@/lib/format";

const ALL_GROUPS = "all";
const PAGE_SIZE = 12;

export default function DebtorsPage() {
  const [month, setMonth] = useAtom(monthAtom);
  const [debtorsCache, setDebtorsCache] = useAtom(debtorsPageCacheAtom);
  const [groups, setGroups] = useAtom(groupsAtom);
  const [studentsVersion] = useAtom(studentsVersionAtom);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [group, setGroup] = useState(ALL_GROUPS);
  const [loadError, setLoadError] = useState<{ key: string; message: string } | null>(null);
  const [dialog, setDialog] = useState<{
    open: boolean;
    studentId: string | null;
  }>({
    open: false,
    studentId: null,
  });
  const queryKey = JSON.stringify({
    month,
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    groupId: group === ALL_GROUPS ? "" : group,
  });
  const debtors = debtorsCache[queryKey] ?? null;
  const error = loadError?.key === queryKey ? loadError.message : "";
  const loading = debtors === null && !error;

  useEffect(() => {
    if (groups !== null) return;
    api
      .listGroups({ page: 1, limit: 1000 })
      .then((data) => setGroups(data.items))
      .catch(() => {
      });
  }, [groups, setGroups]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const cached = debtorsCache[queryKey];
    if (cached) return;
    api
      .getDebtors({
        month: month || undefined,
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        groupId: group === ALL_GROUPS ? undefined : group,
      })
      .then((data) => {
        if (cancelled) return;
        setDebtorsCache((cache) => ({ ...cache, [queryKey]: data }));
        setLoadError((current) => current?.key === queryKey ? null : current);
        if (data.items.length === 0 && data.total > 0 && page > 1) {
          setPage(data.totalPages);
        }
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError({
            key: queryKey,
            message:
              err instanceof Error ? err.message : "Qarzdorlarni yuklashda xatolik",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [
    month,
    studentsVersion,
    page,
    debouncedSearch,
    group,
    queryKey,
    debtorsCache,
    setDebtorsCache,
  ]);

  const groupsList = (groups ?? []).map((g) => ({ id: g.id, name: g.name }));

  const columns: Column<Debtor>[] = [
    { id: "name", header: "Ism", cell: (row) => row.name },
    { id: "phone", header: "Telefon", cell: (row) => formatPhone(row.phone) },
    { id: "group", header: "Guruh", cell: (row) => row.group },
    {
      id: "monthlyAmount",
      header: "Oylik to'lov",
      cell: (row) => formatMoney(row.monthlyAmount),
    },
    {
      id: "paid",
      header: "Toʻlangan",
      cell: (row) => (
        <p className="text-emerald-500 dark:text-emerald-300">{formatMoney(row.paid)}</p>
      ),
    },
    {
      id: "debt",
      header: "Qarz",
      cell: (row) => (
        <p className="text-red-500 dark:text-red-300">{formatMoney(row.debt)}</p>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: (row) => (
        <Button
          size="sm"
          variant="outline"
          className="h-9"
          onClick={() => setDialog({ open: true, studentId: row.studentId })}
        >
          Toʻlov qoʻshish
        </Button>
      ),
    },
  ];

  const triggerClass = "h-11 sm:h-9";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Qarzdorlar</h2>
        <Button
          onClick={() => setDialog({ open: true, studentId: null })}
          className="shrink-0"
        >
          <PlusIcon />
          Toʻlov qoʻshish
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-1">
        <Input
          placeholder="Ism boʻyicha qidirish…"
          className="w-full sm:flex-1 h-11 sm:h-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2">
          <MonthSelect
            value={month}
            onChange={(m) => {
              setMonth(m || "");
              setPage(1);
            }}
            className={`min-w-40 flex-1 ${triggerClass}`}
          />
          <Select
            value={group}
            onValueChange={(value) => {
              setGroup(`${value}`);
              setPage(1);
            }}
            items={[
              { value: ALL_GROUPS, label: "Barcha guruhlar" },
              ...groupsList.map((g) => ({ value: g.id, label: g.name })),
            ]}
            disabled={loading || !debtors}
          >
            <SelectTrigger
              aria-label="Guruh boʻyicha filtrlash"
              className={`min-w-28 flex-1 ${triggerClass}`}
            >
              <SelectValue placeholder="Guruh" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_GROUPS}>Barcha guruhlar</SelectItem>
              {groupsList.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!error && (
        <>
          <DataTable
            data={debtors?.items ?? []}
            columns={columns}
            loading={loading}
            emptyMessage={
              debouncedSearch
                ? "Hech narsa topilmadi"
                : "Bu oyda qarzdor yoʻq"
            }
          />
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Jami {debtors?.total ?? 0} qarzdor
            </p>
            <Pagination
              page={debtors?.page ?? page}
              totalPages={debtors?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      {dialog.open && (
        <PaymentDialog
          key={`${dialog.open}-${dialog.studentId ?? "blank"}`}
          presetStudentId={dialog.studentId}
          onFinish={() => {
            setDialog({ open: false, studentId: null });
            setDebtorsCache({});
          }}
          onDismiss={() => setDialog({ open: false, studentId: null })}
        />
      )}
    </div>
  );
}
