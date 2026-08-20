import * as React from "react";
import { DayPicker, SelectSingleEventHandler } from "react-day-picker";

import CalendarIcon from "./assets/booking/calendar.svg";

interface IWorkingDayCalendarProps {
    id: string;
    invalid?: boolean;
    onChange: (value: string) => void;
    value: string;
}

const toLocalDateValue = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const fromLocalDateValue = (value: string): Date | undefined => {
    const [year, month, day] = value.split("-").map(Number);

    if (!year || !month || !day) {
        return undefined;
    }

    const date = new Date(year, month - 1, day);

    return Number.isNaN(date.getTime()) ? undefined : date;
};

export const isWorkingDay = (date: Date): boolean =>
    date.getDay() !== 0 && date.getDay() !== 6;

export const getToday = (): Date => {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

export const getFirstSelectableDay = (): Date => {
    const date = getToday();

    while (!isWorkingDay(date)) {
        date.setDate(date.getDate() + 1);
    }

    return date;
};

export const getLastSelectableDay = (): Date => {
    const date = getFirstSelectableDay();
    let count = 1;

    while (count < 60) {
        date.setDate(date.getDate() + 1);

        if (isWorkingDay(date)) {
            count += 1;
        }
    }

    return date;
};

export const isSelectableBookingDate = (value: string): boolean => {
    const date = fromLocalDateValue(value);

    if (!date || !isWorkingDay(date)) {
        return false;
    }

    return date >= getToday() && date <= getLastSelectableDay();
};

export const getDefaultBookingDate = (): string =>
    toLocalDateValue(getFirstSelectableDay());

export const WorkingDayCalendar: React.FC<IWorkingDayCalendarProps> = ({
    id,
    invalid,
    onChange,
    value
}) => {
    const [open, setOpen] = React.useState(false);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const selected = fromLocalDateValue(value);
    const firstDate = getToday();
    const lastDate = getLastSelectableDay();
    React.useEffect(() => {
        if (!open) {
            return undefined;
        }

        const closeWhenOutside = (event: Event): void => {
            const target = event.target;

            if (
                target instanceof Node &&
                !rootRef.current?.contains(target)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener("pointerdown", closeWhenOutside);
        document.addEventListener("focusin", closeWhenOutside);

        return () => {
            document.removeEventListener("pointerdown", closeWhenOutside);
            document.removeEventListener("focusin", closeWhenOutside);
        };
    }, [open]);

    const handleSelect: SelectSingleEventHandler = (date) => {
        if (date) {
            onChange(toLocalDateValue(date));
            setOpen(false);
        }
    };

    return (
        <div className="working-day-calendar" ref={rootRef}>
            <button
                className="working-day-calendar-trigger"
                id={id}
                type="button"
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-invalid={invalid}
                onClick={() => setOpen(!open)}
            >
                <span>
                    {selected
                        ? new Intl.DateTimeFormat("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                          }).format(selected)
                        : "Select date"}
                </span>
                <CalendarIcon aria-hidden="true" focusable="false" />
            </button>
            {open ? (
                <div
                    className="working-day-calendar-popover"
                    role="dialog"
                    aria-label="Choose booking date"
                >
                    <DayPicker
                        defaultMonth={selected ?? firstDate}
                        disabled={[
                            { before: firstDate },
                            { after: lastDate },
                            { dayOfWeek: [0, 6] }
                        ]}
                        fromDate={firstDate}
                        mode="single"
                        selected={selected}
                        toDate={lastDate}
                        onSelect={handleSelect}
                    />
                </div>
            ) : null}
        </div>
    );
};
