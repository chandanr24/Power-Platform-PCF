export interface IEmployee {
    employeeId: string;
    email: string;
    managerEmail: string;
    name: string;
}

export interface ISeat {
    floor: string;
    seatKey: string;
    seatNumber: string;
    zone: string;
}

export interface ISeatRange {
    endNumber: number;
    floor: string;
    numberPadding: number;
    rangeId: string;
    seatPrefix: string;
    startNumber: number;
    zone: string;
}

export interface ISeatException {
    endDate?: string;
    seatKey: string;
    startDate?: string;
    status: string;
}

export interface ISeatBooking {
    bookingId: string;
    bookingDate: string;
    bookingKey: string;
    createdByEmail: string;
    employeeEmail: string;
    expiresAt?: string;
    floor: string;
    seatKey: string;
    seatNumber: string;
    status: string;
    zone: string;
}

export interface IBookingFilters {
    date: string;
    floor: string;
    zone: string;
}

export interface IBookingSelection {
    employees: IEmployee[];
    filters: IBookingFilters;
}

export interface ISeatAssignment {
    bookingId?: string;
    bookingKey: string;
    employee: IEmployee;
    expiresAt: string;
    seat: ISeat;
}

export type BookingAction =
    | "reserve"
    | "release"
    | "releaseGroup"
    | "confirmGroup";

export interface IBookingActionRequest {
    action: BookingAction;
    assignments: {
        bookingDate: string;
        bookingId?: string;
        bookingKey: string;
        employeeEmail: string;
        employeeId: string;
        employeeName: string;
        expiresAt?: string;
        floor: string;
        seatKey: string;
        seatNumber: string;
        zone: string;
    }[];
    requestId: string;
}

export interface IBookingActionResult {
    action: BookingAction;
    error?: string;
    records?: {
        bookingId?: string;
        bookingKey: string;
        expiresAt?: string;
        seatKey: string;
    }[];
    requestId: string;
    success: boolean;
}

export const normalizeDateValue = (value: unknown): string => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, "0");
        const day = String(value.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    return typeof value === "string" ? value.slice(0, 10) : "";
};

export const isActiveBooking = (booking: ISeatBooking): boolean =>
    booking.status.trim().toLowerCase() !== "cancelled";

export const isSelectedBooking = (booking: ISeatBooking): boolean =>
    booking.status.trim().toLowerCase() === "selected";

export const normalizeEmail = (value: string): string =>
    value.trim().toLowerCase();

export const createSeatKey = (
    floor: string,
    zone: string,
    seatNumber: string
): string =>
    [floor, zone, seatNumber]
        .map((value) => value.trim().toLowerCase())
        .join("|");

export const isSeatExceptionActive = (
    exception: ISeatException,
    bookingDate: string
): boolean => {
    const status = exception.status.trim().toLowerCase();

    if (status !== "maintenance" && status !== "disabled") {
        return false;
    }

    const normalizedBookingDate = normalizeDateValue(bookingDate);
    const startDate = normalizeDateValue(exception.startDate);
    const endDate = normalizeDateValue(exception.endDate);

    return (
        (!startDate || normalizedBookingDate >= startDate) &&
        (!endDate || normalizedBookingDate <= endDate)
    );
};

export const parseActionResult = (
    value: string | null
): IBookingActionResult | undefined => {
    if (!value?.trim()) {
        return undefined;
    }

    try {
        const parsed: unknown = JSON.parse(value);

        if (
            typeof parsed !== "object" ||
            parsed === null ||
            !("requestId" in parsed) ||
            !("action" in parsed) ||
            !("success" in parsed)
        ) {
            return undefined;
        }

        const result = parsed as Record<string, unknown>;

        if (
            typeof result.requestId !== "string" ||
            typeof result.action !== "string" ||
            typeof result.success !== "boolean"
        ) {
            return undefined;
        }

        return parsed as IBookingActionResult;
    } catch {
        return undefined;
    }
};
