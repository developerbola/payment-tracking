import { useState } from "react";
import { CalendarIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currentMonth } from "@/lib/format";

type MonthSelectProps = {
  value: string;
  onChange: (month: string) => void;
  className?: string;
  id?: string;
};

const MONTH_NAMES = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
];

const now = new Date();
const YEAR_FROM = now.getFullYear() - 10;
const YEAR_TO = now.getFullYear() + 10;

export function MonthSelect({ value, onChange, className, id }: MonthSelectProps) {
  const [open, setOpen] = useState(false);
  const monthValue = value || currentMonth();
  const year = Number(monthValue.slice(0, 4));
  const month = Number(monthValue.slice(5, 7));

  const years = Array.from(
    { length: YEAR_TO - YEAR_FROM + 1 },
    (_, i) => `${YEAR_FROM + i}`
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            className={className}
            aria-label="Oyni tanlash"
          >
            <CalendarIcon className="size-4 text-muted-foreground" />
            <span className="flex-1 text-left">
              {MONTH_NAMES[month - 1]} {year}
            </span>
          </Button>
        }
      />
      <PopoverContent align="start" className="w-64">
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={`${month}`}
            onValueChange={(m) =>
              onChange(`${year}-${`${Number(m)}`.padStart(2, "0")}`)
            }
            items={MONTH_NAMES.map((name, i) => ({
              value: `${i + 1}`,
              label: name,
            }))}
          >
            <SelectTrigger aria-label="Oy" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, i) => (
                <SelectItem key={name} value={`${i + 1}`}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={`${year}`}
            onValueChange={(y) =>
              onChange(`${y}-${`${month}`.padStart(2, "0")}`)
            }
            items={years.map((y) => ({ value: y, label: y }))}
          >
            <SelectTrigger aria-label="Yil" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setOpen(false)}
        >
          <CheckIcon />
          Tayyor
        </Button>
      </PopoverContent>
    </Popover>
  );
}
