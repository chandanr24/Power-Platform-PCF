import * as React from "react";

import { BackButton } from "./BackButton";
import { ErrorDialog } from "./ErrorDialog";
import {
    IBookingActionRequest,
    IBookingActionResult,
    IEmployee,
    ISeatBooking
} from "./BookingModels";

export interface ICancelBookingScreenProps {
    actionResult?: IBookingActionResult;
    allocatedHeight: number;
    allocatedWidth: number;
    bookings: ISeatBooking[];
    currentUserEmail: string;
    currentUserEmployeeCode: string;
    employees: IEmployee[];
    visibleRecordCount?: number;
    onActionRequest: (request: IBookingActionRequest) => void;
    onBack: () => void;
}

const MAX_CANCELLATIONS_PER_REQUEST = 5;

const getToday = (): string => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const isConfirmedBooking = (booking: ISeatBooking): boolean => {
    const status = booking.status.trim().toLowerCase();
    return status === "booked" || status === "confirmed";
};

export const CancelBookingScreen: React.FC<ICancelBookingScreenProps> = ({
    allocatedHeight,
    allocatedWidth,
    bookings,
    currentUserEmployeeCode,
    employees,
    visibleRecordCount,
    onActionRequest,
    onBack,
    actionResult
}) => {
    const [employeeId, setEmployeeId] = React.useState("");
    const [bookingDate, setBookingDate] = React.useState("");
    const [selectedBookingKeys, setSelectedBookingKeys] = React.useState<string[]>([]);
    const [confirming, setConfirming] = React.useState(false);
    const [pendingRequestId, setPendingRequestId] = React.useState("");
    const [errorMessage, setErrorMessage] = React.useState<string | undefined>();
    const [selectionMessage, setSelectionMessage] = React.useState<string | undefined>();
    const today = getToday();
    const currentEmployeeCode = currentUserEmployeeCode.trim().toLowerCase();

    React.useEffect(() => {
        if (!pendingRequestId || !actionResult || actionResult.requestId !== pendingRequestId) {
            return;
        }

        setPendingRequestId("");
        if (actionResult.success) {
            setSelectedBookingKeys([]);
            return;
        }

        setErrorMessage(actionResult.error ?? "The bookings could not be cancelled. Refresh and try again.");
    }, [actionResult, pendingRequestId]);

    const employeeNames = React.useMemo(() => {
        const names = new Map<string, string>();

        employees.forEach((employee) => {
            const employeeCode = employee.employeeId.trim().toLowerCase();

            if (employeeCode) {
                names.set(employeeCode, employee.name);
            }
        });

        return names;
    }, [employees]);
    const authorizedEmployeeIds = React.useMemo(() => {
        const employeeIds = new Set<string>();

        employees.forEach((employee) => {
            const employeeCode = employee.employeeId.trim().toLowerCase();

            if (employeeCode) {
                employeeIds.add(employeeCode);
            }
        });

        if (currentEmployeeCode) {
            employeeIds.add(currentEmployeeCode);
        }

        return employeeIds;
    }, [currentEmployeeCode, employees]);
    const getEmployeeName = (booking: ISeatBooking): string => {
        const employeeName = employeeNames.get(
            booking.employeeId.trim().toLowerCase()
        )?.trim();

        if (employeeName) {
            return employeeName;
        }

        const bookingEmployeeName = booking.employeeName.trim();
        return bookingEmployeeName
            ? bookingEmployeeName
            : "Employee name unavailable";
    };
    const employeeQuery = employeeId.trim().toLowerCase();
    const items = bookings.filter((booking) =>
        Boolean(currentEmployeeCode) &&
        authorizedEmployeeIds.has(booking.employeeId.trim().toLowerCase()) &&
        isConfirmedBooking(booking) &&
        booking.bookingDate >= today &&
        (!employeeQuery ||
            booking.employeeId.toLowerCase().includes(employeeQuery) ||
            getEmployeeName(booking).toLowerCase().includes(employeeQuery)) &&
        (!bookingDate || booking.bookingDate === bookingDate)
    );
    const selectedBookings = items.filter((booking) =>
        selectedBookingKeys.includes(booking.bookingKey)
    );
    const selectionListStyle: React.CSSProperties | undefined =
        visibleRecordCount && visibleRecordCount > 0
            ? { maxHeight: `${visibleRecordCount * 68}px` }
            : undefined;
    const classes = ["cancel-booking-control"];
    if (allocatedWidth > 0 && allocatedWidth <= 600) {
        classes.push("cancel-booking-control--mobile");
    }
    const style = allocatedHeight > 0 ? { height: `${allocatedHeight}px` } : undefined;

    const handleFiltersChanged = (): void => {
        setSelectedBookingKeys([]);
        setErrorMessage(undefined);
    };

    const toggleBooking = (bookingKey: string): void => {
        if (
            !selectedBookingKeys.includes(bookingKey) &&
            selectedBookingKeys.length >= MAX_CANCELLATIONS_PER_REQUEST
        ) {
            setErrorMessage(
                `You can cancel up to ${MAX_CANCELLATIONS_PER_REQUEST} bookings at a time.`
            );
            return;
        }

        setSelectedBookingKeys((currentKeys) =>
            currentKeys.includes(bookingKey)
                ? currentKeys.filter((currentKey) => currentKey !== bookingKey)
                : [...currentKeys, bookingKey]
        );
        setErrorMessage(undefined);
    };

    const confirmCancellation = (): void => {
        if (selectedBookings.length === 0) {
            return;
        }

        const request: IBookingActionRequest = {
            action: "cancelGroup",
            assignments: selectedBookings.map((booking) => ({
                bookingDate: booking.bookingDate,
                bookingId: booking.bookingId,
                bookingKey: booking.bookingKey,
                employeeId: booking.employeeId,
                employeeName: getEmployeeName(booking),
                expiresAt: booking.expiresAt,
                floor: booking.floor,
                seatKey: booking.seatKey,
                seatNumber: booking.seatNumber,
                zone: booking.zone
            })),
            requestId: `cancel-${Date.now()}`
        };

        setPendingRequestId(request.requestId);
        setErrorMessage(undefined);
        onActionRequest(request);
        setConfirming(false);
    };

    return (
        <main className={classes.join(" ")} style={style}>
            <section className="cancel-booking-card" aria-labelledby="cancel-booking-title">
                <header className="cancel-booking-header">
                    <BackButton label="Back to home" onClick={onBack} />
                    <div>
                        <h1 id="cancel-booking-title">Cancel Booking</h1>
                        <p>Find an upcoming confirmed booking to cancel.</p>
                    </div>
                </header>
                <div className="cancel-booking-filters">
                    <label>
                        Employee Code or Name
                        <input
                            type="search"
                            value={employeeId}
                            placeholder="Search employee code or name"
                            onChange={(event) => {
                                setEmployeeId(event.target.value);
                                handleFiltersChanged();
                            }}
                        />
                    </label>
                    <label>
                        Booking Date
                        <input
                            type="date"
                            min={today}
                            value={bookingDate}
                            onChange={(event) => {
                                setBookingDate(event.target.value);
                                handleFiltersChanged();
                            }}
                        />
                    </label>
                </div>
                {items.length ? (
                    <fieldset className="cancel-booking-list">
                        <legend>Select up to {MAX_CANCELLATIONS_PER_REQUEST} bookings to cancel</legend>
                        <div className="cancel-booking-items" style={selectionListStyle}>
                            {items.map((booking) => (
                                <label className="cancel-booking-item" key={booking.bookingKey}>
                                    <input
                                        type="checkbox"
                                        checked={selectedBookingKeys.includes(booking.bookingKey)}
                                        onChange={() => toggleBooking(booking.bookingKey)}
                                    />
                                    <span>
                                        <strong>{booking.seatNumber}</strong>
                                        <small>{getEmployeeName(booking)} · {booking.employeeId} · {booking.bookingDate} · {booking.floor} · {booking.zone}</small>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                ) : (
                    <div className="cancel-booking-empty">
                        <strong>No eligible bookings</strong>
                        <p>There are no confirmed bookings from today onward for these filters.</p>
                    </div>
                )}
                <button
                    className="cancel-booking-primary"
                    type="button"
                    disabled={selectedBookings.length === 0 || Boolean(pendingRequestId)}
                    onClick={() => setConfirming(true)}
                >
                    Cancel selected bookings{selectedBookings.length ? ` (${selectedBookings.length})` : ""}
                </button>
            </section>
            <ErrorDialog
                message={errorMessage}
                onDismiss={() => setErrorMessage(undefined)}
            />
            {confirming && selectedBookings.length > 0 ? (
                <div className="cancel-booking-dialog-backdrop">
                    <section className="cancel-booking-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-cancellation">
                        <h2 id="confirm-cancellation">Cancel {selectedBookings.length === 1 ? "this booking" : `${selectedBookings.length} bookings`}?</h2>
                        <p>{selectedBookings.length === 1
                            ? <>The booking for <strong>{selectedBookings[0].seatNumber}</strong> on {selectedBookings[0].bookingDate} will be cancelled.</>
                            : <>The selected bookings will be cancelled. Only successfully updated bookings receive a cancellation email.</>}</p>
                        <footer>
                            <button type="button" onClick={() => setConfirming(false)}>Keep booking</button>
                            <button className="cancel-booking-confirm" type="button" onClick={confirmCancellation}>Cancel {selectedBookings.length === 1 ? "booking" : "bookings"}</button>
                        </footer>
                    </section>
                </div>
            ) : null}
        </main>
    );
};