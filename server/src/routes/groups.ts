import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { supabase } from "../db.js";

const router = Router();

const idSchema = z.uuid();

const createGroupSchema = z.object({
  name: z.string().trim().min(1),
  price: z.number().int().positive(),
});

const updateGroupSchema = createGroupSchema.partial();

const listGroupsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(12),
  search: z.string().trim().max(100).optional(),
  minPrice: z.coerce.number().int().positive().optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
});

type GroupRow = {
  id: string;
  name: string;
  price: number;
};

function toGroup(row: GroupRow) {
  return { id: row.id, name: row.name, price: row.price };
}

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

// Duplicate group names are a 409, not a raw 500.
function isUniqueViolation(error: { code?: string; message?: string }) {
  return error?.code === "23505" || /duplicate key|unique/i.test(error?.message ?? "");
}

router.get("/groups", async (req, res) => {
  const query = listGroupsQuerySchema.safeParse(req.query);
  if (!query.success) {
    const message = query.error.issues
      .map((issue) => `${issue.path.join(".") || "query"}: ${issue.message}`)
      .join("; ");
    return res.status(400).json({ error: message });
  }
  const { page, limit, search, minPrice, maxPrice } = query.data;

  let builder = supabase
    .from("groups")
    .select("id, name, price", { count: "exact" })
    .order("created_at");
  if (search) builder = builder.ilike("name", `%${search}%`);
  if (minPrice !== undefined) builder = builder.gte("price", minPrice);
  if (maxPrice !== undefined) builder = builder.lte("price", maxPrice);

  const { data, count, error } = await builder.range(
    (page - 1) * limit,
    page * limit - 1,
  );

  // Same past-the-end handling as /students: PGRST103 means the requested
  // page is beyond the last one; answer with an empty page + real totals.
  if (error && error.code === "PGRST103") {
    let counter = supabase
      .from("groups")
      .select("id", { count: "exact", head: true });
    if (search) counter = counter.ilike("name", `%${search}%`);
    if (minPrice !== undefined) counter = counter.gte("price", minPrice);
    if (maxPrice !== undefined) counter = counter.lte("price", maxPrice);
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
    items: (data as GroupRow[]).map(toGroup),
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / limit)),
  });
});

router.post("/groups", async (req, res) => {
  const body = parseBody(req, res, createGroupSchema);
  if (!body) return;

  const { data, error } = await supabase
    .from("groups")
    .insert({ name: body.name, price: body.price })
    .select()
    .single();

  if (error) {
    if (isUniqueViolation(error))
      return res.status(409).json({ error: "Group name already exists" });
    return res.status(500).json({ error: error.message });
  }
  return res.status(201).json(toGroup(data as GroupRow));
});

router.patch("/groups/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ error: "Group not found" });

  const body = parseBody(req, res, updateGroupSchema);
  if (!body) return;
  if (Object.keys(body).length === 0)
    return res.status(400).json({ error: "No fields to update" });

  const { data, error } = await supabase
    .from("groups")
    .update({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.price !== undefined && { price: body.price }),
    })
    .eq("id", id.data)
    .select()
    .maybeSingle();

  if (error) {
    if (isUniqueViolation(error))
      return res.status(409).json({ error: "Group name already exists" });
    return res.status(500).json({ error: error.message });
  }
  if (!data) return res.status(404).json({ error: "Group not found" });
  return res.json(toGroup(data as GroupRow));
});

router.delete("/groups/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ error: "Group not found" });

  // Groups referenced by students cannot be deleted (FK restrict).
  const { count, error: countError } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("group_id", id.data);

  if (countError) return res.status(500).json({ error: countError.message });
  if (count !== null && count > 0)
    return res.status(409).json({
      error: `Group is in use by ${count} student${count === 1 ? "" : "s"}`,
    });

  const { data, error } = await supabase
    .from("groups")
    .delete()
    .eq("id", id.data)
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Group not found" });
  return res.status(204).send();
});

export default router;
