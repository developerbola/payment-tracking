const BASE_URL = import.meta.env.VITE_API_URL ?? "";

export type Group = {
  id: string;
  name: string;
  price: number;
};

export type Student = {
  id: string;
  name: string;
  phone: string;
  groupId: string;
  group: string;
  monthlyAmount: number;
};

export type Payment = {
  id: string;
  studentId: string;
  amount: number;
  month: string;
};

export type Debtor = {
  studentId: string;
  name: string;
  phone: string;
  groupId: string;
  group: string;
  monthlyAmount: number;
  paid: number;
  debt: number;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: init?.body
      ? { "Content-Type": "application/json", ...init?.headers }
      : init?.headers,
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch (err) {
      console.error(err);
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  // ===== GROUPS =====
  listGroups: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    if (params?.minPrice !== undefined) qs.set("minPrice", String(params.minPrice));
    if (params?.maxPrice !== undefined) qs.set("maxPrice", String(params.maxPrice));
    const query = qs.toString();
    return request<Paginated<Group>>(`/groups${query ? `?${query}` : ""}`);
  },
  createGroup: (body: { name: string; price: number }) =>
    request<Group>("/groups", { method: "POST", body: JSON.stringify(body) }),
  updateGroup: (id: string, body: { name?: string; price?: number }) =>
    request<Group>(`/groups/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteGroup: (id: string) =>
    request<void>(`/groups/${id}`, { method: "DELETE" }),

  // ===== STUDENTS =====
  listStudents: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    groupId?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    if (params?.groupId) qs.set("groupId", params.groupId);
    const query = qs.toString();
    return request<Paginated<Student>>(`/students${query ? `?${query}` : ""}`);
  },
  createStudent: (body: { name: string; phone: string; groupId: string }) =>
    request<Student>("/students", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateStudent: (
    id: string,
    body: { name?: string; phone?: string; groupId?: string },
  ) =>
    request<Student>(`/students/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteStudent: (id: string) =>
    request<void>(`/students/${id}`, { method: "DELETE" }),

  // ===== DEBTS =====
  createPayment: (studentId: string, body: { amount: number; month: string }) =>
    request<Payment>(`/students/${studentId}/payments`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getDebtors: (params?: {
    month?: string;
    page?: number;
    limit?: number;
    search?: string;
    groupId?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.month) qs.set("month", params.month);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    if (params?.groupId) qs.set("groupId", params.groupId);
    const query = qs.toString();
    return request<Paginated<Debtor>>(
      `/debtors${query ? `?${query}` : ""}`,
    );
  },
};
