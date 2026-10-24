import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { supabase } from "../db.js";

const router = Router();

const idSchema = z.uuid();

const createStudentSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  groupId: idSchema,
});

const updateStudentSchema = createStudentSchema.partial();

const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(12),
  search: z.string().trim().max(100).optional(),
  groupId: z.uuid().optional(),
});

const createPaymentSchema = z.object({
  amount: z.number().int().positive(),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be in YYYY-MM format")
    .refine((month) => Number(month.slice(0, 4)) > 0, "month must be valid"),
});

type StudentRow = {
  id: string;
  name: string;
  phone: string;
  group_id: string;
  groups: { name: string; price: number } | null;
};

type PaymentRow = {
  id: string;
  student_id: string;
  amount: number;
  paid_month: string;
};

function toStudent(row: StudentRow) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    groupId: row.group_id,
    group: row.groups?.name ?? "",
    monthlyAmount: row.groups?.price ?? 0,
  };
}

function toPayment(row: PaymentRow) {
  return {
    id: row.id,
    studentId: row.student_id,
    amount: row.amount,
    month: row.paid_month.slice(0, 7),
  };
}

// Parse request body with zod; on failure sends a 400 and returns null.
function parseBody<T extends z.ZodTypeAny>(req: Request, res: Response, schema: T): z.infer<T> | null {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      .join("; ");
    res.status(400).json({ error: message });
    return null;
  }
  return result.data;
}

async function studentExists(id: string): Promise<boolean> {
  const { error, count } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("id", id);
  return !error && count === 1;
}

router.post("/students", async (req, res) => {
  const body = parseBody(req, res, createStudentSchema);
  if (!body) return;

  const group = await supabase
    .from("groups")
    .select("id")
    .eq("id", body.groupId)
    .maybeSingle();
  if (group.error) return res.status(500).json({ error: group.error.message });
  if (!group.data) return res.status(400).json({ error: "Group not found" });

  const { data, error } = await supabase
    .from("students")
    .insert({
      name: body.name,
      phone: body.phone,
      group_id: body.groupId,
    })
    .select("id, name, phone, group_id, groups:group_id (name, price)")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(toStudent(data as unknown as StudentRow));
});

router.get("/students", async (req, res) => {
  const query = listStudentsQuerySchema.safeParse(req.query);
  if (!query.success) {
    const message = query.error.issues
      .map((issue) => `${issue.path.join(".") || "query"}: ${issue.message}`)
      .join("; ");
    return res.status(400).json({ error: message });
  }
  const { page, limit, search, groupId } = query.data;

  let builder = supabase
    .from("students")
    .select("id, name, phone, group_id, groups:group_id (name, price)", {
      count: "exact",
    })
    .order("created_at");
  if (search) builder = builder.ilike("name", `%${search}%`);
  if (groupId) builder = builder.eq("group_id", groupId);

  const { data, count, error } = await builder.range(
    (page - 1) * limit,
    page * limit - 1,
  );

  // A page past the end makes PostgREST fail with PGRST103 instead of
  // returning an empty list. Answer with an empty page plus the real
  // totals (via a count-only request) so clients can step back.
  if (error && error.code === "PGRST103") {
    let counter = supabase
      .from("students")
      .select("id", { count: "exact", head: true });
    if (search) counter = counter.ilike("name", `%${search}%`);
    if (groupId) counter = counter.eq("group_id", groupId);
    const { count: fallbackCount, error: countError } = await counter;
    if (countError) return res.status(500).json({ error: countError.message });
    const total = fallbackCount ?? 0;
    return res.json({
      items: [],
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  }
  if (error) return res.status(500).json({ error: error.message });

  return res.json({
    items: (data as unknown as StudentRow[]).map(toStudent),
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / limit)),
  });
});

router.patch("/students/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ error: "Student not found" });

  const body = parseBody(req, res, updateStudentSchema);
  if (!body) return;
  if (Object.keys(body).length === 0)
    return res.status(400).json({ error: "No fields to update" });

  if (body.groupId !== undefined) {
    const group = await supabase
      .from("groups")
      .select("id")
      .eq("id", body.groupId)
      .maybeSingle();
    if (group.error) return res.status(500).json({ error: group.error.message });
    if (!group.data) return res.status(400).json({ error: "Group not found" });
  }

  const { data, error } = await supabase
    .from("students")
    .update({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.groupId !== undefined && { group_id: body.groupId }),
    })
    .eq("id", id.data)
    .select("id, name, phone, group_id, groups:group_id (name, price)")
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Student not found" });
  return res.json(toStudent(data as unknown as StudentRow));
});

router.delete("/students/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ error: "Student not found" });

  const { data, error } = await supabase
    .from("students")
    .delete()
    .eq("id", id.data)
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Student not found" });
  return res.status(204).send();
});

router.post("/students/:id/payments", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ error: "Student not found" });

  const body = parseBody(req, res, createPaymentSchema);
  if (!body) return;

  if (!(await studentExists(id.data))) return res.status(404).json({ error: "Student not found" });

  const { data, error } = await supabase
    .from("payments")
    .insert({
      student_id: id.data,
      amount: body.amount,
      paid_month: `${body.month}-01`,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(toPayment(data as PaymentRow));
});

router.get("/students/:id/payments", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ error: "Student not found" });

  if (!(await studentExists(id.data))) return res.status(404).json({ error: "Student not found" });

  const { data, error } = await supabase
    .from("payments")
    .select("id, student_id, amount, paid_month")
    .eq("student_id", id.data)
    .order("paid_month", { ascending: false })
    .order("id", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json((data as PaymentRow[]).map(toPayment));
});

export default router;
