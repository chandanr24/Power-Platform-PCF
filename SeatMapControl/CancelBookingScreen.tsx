import * as React from "react";

import { BackButton } from "./BackButton";
import {
    IBookingActionRequest,
    ISeatBooking
} from "./BookingModels";

export interface ICancelBookingScreenProps {
    allocatedHeight: number;
    allocatedWidth: number;
    bookings: ISeatBooking[];
    currentUserEmail: string;
    visibleRecordCount?: number;
    onActionRequest: (request: IBookingActionRequest) => void;
    onBack: () => void;
}

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
    visibleRecordCount,
    onActionRequest,
    onBack
}) => {
    const [employeeId, setEmployeeId] = React.useState("");
    const [bookingDate, setBookingDate] = React.useState("");
    const [selectedBookingKey, setSelectedBookingKey] = React.useState("");
    const [confirming, setConfirming] = React.useState(false);
    const today = getToday();
    const selectedBooking = bookings.find(
        (booking) => booking.bookingKey === selectedBookingKey
    );
    const items = bookings.filter((booking) =>
        isConfirmedBooking(booking) &&
        booking.bookingDate >= today &&
        (!employeeId || booking.employeeId.toLowerCase().includes(employeeId.trim().toLowerCase())) &&
        (!bookingDate || booking.bookingDate === bookingDate)
    );
    const selectionListStyle: React.CSSProperties | undefined =
        visibleRecordCount && visibleRecordCount > 0
            ? { maxHeight: `${visibleRecordCount * 64 + 30}px` }
            : undefined;
    const classes = ["cancel-booking-control"];
    if (allocatedWidth > 0 && allocatedWidth <= 600) {
        classes.push("cancel-booking-control--mobile");
    }
    const style = allocatedHeight > 0 ? { height: `${allocatedHeight}px` } : undefined;

    const handleFiltersChanged = (): void => {
        setSelectedBookingKey("");
    };

    const confirmCancellation = (): void => {
        if (!selectedBooking) {
            return;
        }

        const request: IBookingActionRequest = {
            action: "release",
            assignments: [{
                bookingDate: selectedBooking.bookingDate,
                bookingId: selectedBooking.bookingId,
                bookingKey: selectedBooking.bookingKey,
                employeeEmail: selectedBooking.employeeEmail,
                employeeId: selectedBooking.employeeId,
                employeeName: selectedBooking.employeeEmail,
                expiresAt: selectedBooking.expiresAt,
                floor: selectedBooking.floor,
                seatKey: selectedBooking.seatKey,
                seatNumber: selectedBooking.seatNumber,
                zone: selectedBooking.zone
            }],
            requestId: `release-${Date.now()}-${selectedBooking.bookingId}`
        };

        onActionRequest(request);
        setConfirming(false);
        setSelectedBookingKey("");
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
                        Employee Code
                        <input
                            type="search"
                            value={employeeId}
                            placeholder="Search employee code"
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
                    <fieldset className="cancel-booking-list" style={selectionListStyle}>
                        <legend>Select one booking to cancel</legend>
                        {items.map((booking) => (
                            <label className="cancel-booking-item" key={booking.bookingKey}>
                                <input
                                    type="radio"
                                    name="booking-to-cancel"
                                    checked={booking.bookingKey === selectedBookingKey}
                                    onChange={() => setSelectedBookingKey(booking.bookingKey)}
                                />
                                <span>
                                    <strong>{booking.seatNumber}</strong>
                                    <small>{booking.employeeId} · {booking.bookingDate} · {booking.floor} · {booking.zone}</small>
                                </span>
                            </label>
                        ))}
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
                    disabled={!selectedBooking}
                    onClick={() => setConfirming(true)}
                >
                    Cancel selected booking
                </button>
            </section>
            {confirming && selectedBooking ? (
                <div className="cancel-booking-dialog-backdrop">
                    <section className="cancel-booking-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-cancellation">
                        <h2 id="confirm-cancellation">Cancel this booking?</h2>
                        <p>Your booking for <strong>{selectedBooking.seatNumber}</strong> on {selectedBooking.bookingDate} will be released.</p>
                        <footer>
                            <button type="button" onClick={() => setConfirming(false)}>Keep booking</button>
                            <button className="cancel-booking-confirm" type="button" onClick={confirmCancellation}>Cancel booking</button>
                        </footer>
                    </section>
                </div>
            ) : null}
        </main>
    );
};