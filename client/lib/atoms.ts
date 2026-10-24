import { atom } from "jotai";
import type { Debtor, Group, Paginated, Student } from "@/lib/api";
import { currentMonth } from "@/lib/format";

export const monthAtom = atom(currentMonth());
export const studentsAtom = atom<Student[] | null>(null);
export const groupsAtom = atom<Group[] | null>(null);
export const groupsPageCacheAtom = atom<Record<string, Paginated<Group>>>({});
export const studentsPageCacheAtom = atom<Record<string, Paginated<Student>>>({});
export const debtorsPageCacheAtom = atom<Record<string, Paginated<Debtor>>>({});

export const studentsVersionAtom = atom(0);
