import type * as React from "react";

export const formatMoney = (value: number) =>
  new Intl.NumberFormat("ru-RU").format(value);

export const formatPhone = (phone: string) => {
  const m = /^\+?998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(
    phone.replace(/[\s-]/g, ""),
  );
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
};

export const phoneLocalDigits = (input: string) => {
  let digits = input.replace(/\D/g, "");
  if (digits.length > 9 && digits.startsWith("998")) digits = digits.slice(3);
  return digits.slice(0, 9);
};

export const formatPhoneLocal = (input: string, trail = true) => {
  const digits = phoneLocalDigits(input);
  if (!digits) return "";
  const lens = [2, 3, 2, 2];
  let out = "";
  let at = 0;
  for (const len of lens) {
    if (at >= digits.length) break;
    if (out && !out.endsWith(" ")) out += " ";
    const chunk = digits.slice(at, at + len);
    out += chunk;
    at += len;
    if (trail && chunk.length === len && at < 9) out += " ";
  }
  return out;
};

export const formatAmountGrouping = (input: string, trail = true) => {
  const digits = input.replace(/\D/g, "").slice(0, 15).replace(/^0+(?=\d)/, "");
  if (!digits) return "";
  let out = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (trail && digits.length % 3 === 0) out += " ";
  return out;
};

export const digitsOnly = (value: string) => value.replace(/\D/g, "");

const wasDeletion = (event: React.ChangeEvent<HTMLInputElement>) => {
  const inputType = (event.nativeEvent as InputEvent).inputType;
  return (
    inputType === "deleteContentBackward" ||
    inputType === "deleteContentForward"
  );
};

export const onTypedFormat =
  (
    formatter: (input: string, trail?: boolean) => string,
    onValue: (value: string) => void,
  ) =>
  (event: React.ChangeEvent<HTMLInputElement>) =>
    onValue(formatter(event.target.value, !wasDeletion(event)));

export const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}`;
};
