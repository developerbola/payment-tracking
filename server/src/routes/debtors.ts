import { Router } from "express";
import { z } from "zod";
import { supabase } from "../db.js";

const router = Router();

const listDebtorsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(12),
  search: z.string().trim().max(100).optional(),
  groupId: z.uuid().optional(),
});

type DebtorRow = {
  student_id: string;
  name: string;
  phone: string;
  group_id: string;
  group_name: string;
  monthly_amount: number;
  paid: number;
  debt: number;
};

router.get("/debtors", async (req, res) => {
  const query = listDebtorsQuerySchema.safeParse(req.query);
  if (!query.success) {
    const message = query.error.issues
      .map((issue) => `${issue.path.join(".") || "query"}: ${issue.message}`)
      .join("; ");
    return res.status(400).json({ error: message });
  }
  const { page, limit, search, groupId } = query.data;

  const monthParam = req.query.month as string | undefined;

  let month = monthParam;
  if (month === undefined || month === "") {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    month = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  }
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: "month must be in YYYY-MM format" });
  }

  const mm = Number(month.slice(5));
  if (mm < 1 || mm > 12) {
    return res.status(400).json({ error: "month must be in YYYY-MM format" });
  }

  const { data, error } = await supabase.rpc("get_debtors", { month_start: `${month}-01` });

  if (error) return res.status(500).json({ error: error.message });

  let debtors = ((data ?? []) as DebtorRow[]).map((row) => ({
    studentId: row.student_id,
    name: row.name,
    phone: row.phone,
    groupId: row.group_id,
    group: row.group_name,
    monthlyAmount: row.monthly_amount,
    paid: row.paid,
    debt: row.debt,
  }));

  // The RPC has no filter parameters, so name/group filtering and paging
  // happen here, after the month's full debtor list comes back.
  if (groupId) debtors = debtors.filter((d) => d.groupId === groupId);
  if (search) {
    const needle = search.toLowerCase();
    debtors = debtors.filter((d) => d.name.toLowerCase().includes(needle));
  }
  debtors.sort((a, b) => b.debt - a.debt);

  const total = debtors.length;
  const items = debtors.slice((page - 1) * limit, page * limit);

  return res.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

export default router;
