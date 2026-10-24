// One-off seed: two mock groups, 40 students, and 14 debtors for the current month.
// Run from server/:  npx tsx --env-file-if-exists=.env scripts/seed-mock.ts
import { createClient } from "@supabase/supabase-js";

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";
const supabase = createClient(process.env.SUPABASE_URL ?? "", serviceRoleKey, {
  auth: { persistSession: false },
});

const MOCK_GROUPS = [
  { name: "Math-10", price: 300_000 },
  { name: "English-B1", price: 350_000 },
];

const MOCK_STUDENTS = [
  "Ali Karimov",
  "Malika Tosheva",
  "Bekzod Yusupov",
  "Nilufar Qosimova",
  "Jasur Rahimov",
  "Oyadin Ergasheva",
  "Otabek Tursunov",
  "Rayhona Jamaova",
  "Sardor Azizov",
  "Shahzoda Umarova",
  "Dilshod Ergashev",
  "Dilnoza Rasulova",
  "Farrux Nazarov",
  "Gulnora Ismoilova",
  "Islom Sobirov",
  "Zilola Karimova",
  "Jahongir Qodirov",
  "Madina Yusupova",
  "Kamron Aliyev",
  "Sevara Aliyeva",
  "Laziz Sharipov",
  "Oybek Xolmatov",
  "Muhammad G'ulomov",
  "Nodir Hasanov",
  "Rustam Abdullayev",
  "Sanjar Ibrohimov",
  "Temur Yuldashev",
  "Ulug'bek Mirzayev",
  "Xurshid Sattorov",
  "Zafar Mo'minov",
  "Aziza Usmonova",
  "Diyorbek Rahmatov",
  "Mohira Tursunova",
  "Suhrobjon Islomov",
  "Madina Akbarova",
  "Shahriyor Erkinov",
  "Nargiza Saidova",
  "Bobur Xasanov",
  "Gulbahor Mahmudova",
  "Javohir Abdurasulov",
];

// +998 mobile codes in real use.
const PHONE_CODES = [90, 91, 93, 94, 97, 98, 99];

async function main() {
  const groupNames = MOCK_GROUPS.map((group) => group.name);
  const { data: existingGroups, error: groupErr } = await supabase
    .from("groups")
    .select("id, name, price")
    .in("name", groupNames);
  if (groupErr) throw new Error(`Could not read groups: ${groupErr.message}`);

  const existingNames = new Set((existingGroups ?? []).map((group) => group.name));
  const missingGroups = MOCK_GROUPS.filter((group) => !existingNames.has(group.name));
  let createdGroups: typeof existingGroups = [];
  if (missingGroups.length > 0) {
    const { data, error: insertErr } = await supabase
      .from("groups")
      .insert(missingGroups)
      .select("id, name, price");
    if (insertErr) throw new Error(`Could not insert groups: ${insertErr.message}`);
    createdGroups = data;
  }
  const groups = [...(existingGroups ?? []), ...(createdGroups ?? [])];
  if (groups.length !== MOCK_GROUPS.length) {
    throw new Error(`Expected ${MOCK_GROUPS.length} mock groups, found ${groups.length}`);
  }
  console.log(`Ready ${groups.length} mock groups: ${groups.map((g) => g.name).join(", ")}`);

  const groupByName = new Map(groups.map((group) => [group.name, group]));
  const monthDate = new Date();
  const paymentMonth = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-01`;
  const month = paymentMonth.slice(0, 7);

  const students = MOCK_STUDENTS.map((name, i) => {
    const group = groupByName.get(MOCK_GROUPS[i % MOCK_GROUPS.length].name);
    if (!group) throw new Error("Could not find a mock group for a student");
    return {
      name,
      phone: `+998${PHONE_CODES[i % PHONE_CODES.length]}${String(1000000 + i * 137171).slice(0, 7)}`,
      group_id: group.id,
    };
  });

  const { data: inserted, error: studentErr } = await supabase
    .from("students")
    .insert(students)
    .select("id, name, group_id, groups:group_id (name, price)");
  if (studentErr) throw new Error(`Could not insert students: ${studentErr.message}`);
  if (!inserted || inserted.length !== MOCK_STUDENTS.length) {
    throw new Error(
      `Expected to insert ${MOCK_STUDENTS.length} students, inserted ${inserted?.length ?? 0}`,
    );
  }

  const groupPriceById = new Map(groups.map((g) => [g.id, g.price] as const));

  const payments: { student_id: string; amount: number; paid_month: string }[] = [];
  inserted.forEach((s, i) => {
    const price = groupPriceById.get(s.group_id);
    if (price === undefined) throw new Error(`Could not find price for student ${s.id}`);
    if (i < 7) return;
    const amount = i < 14 ? Math.floor(price / 2) : price;
    payments.push({ student_id: s.id, amount, paid_month: paymentMonth });
  });

  const { error: payErr } = await supabase.from("payments").insert(payments);
  if (payErr) throw new Error(`Could not insert payments: ${payErr.message}`);

  const { data: debtors, error: debtorErr } = await supabase.rpc(
    "get_debtors",
    { month_start: paymentMonth },
  );
  if (debtorErr) throw new Error(`Could not verify debtors: ${debtorErr.message}`);
  const seededStudentIds = new Set(inserted.map((student) => student.id));
  const debtorRows = (debtors ?? []) as { student_id: string }[];
  const seededDebtors = debtorRows.filter((debtor) =>
    seededStudentIds.has(debtor.student_id),
  ).length;
  if (seededDebtors !== 14) {
    throw new Error(`Expected 14 mock debtors for ${month}, found ${seededDebtors}`);
  }

  console.log(
    `Inserted ${inserted.length} students and ${payments.length} payments.\n` +
      `Mock debtors for ${month}: ${seededDebtors}`
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
