import * as React from "react";

import { BookingProgress, PrimaryButton } from "./BookingComponents";
import {
    IBookingSelection,
    ISeatAssignment
} from "./BookingModels";

export interface IBookingConfirmationScreenProps {
    allocatedHeight: number;
    allocatedWidth: number;
    assignments: ISeatAssignment[];
    bookingSelection: IBookingSelection;
    onBookAnother: () => void;
    onViewBookings: () => void;
}

export const BookingConfirmationScreen: React.FC<
    IBookingConfirmationScreenProps
> = ({
    allocatedHeight,
    allocatedWidth,
    assignments,
    bookingSelection,
    onBookAnother,
    onViewBookings
}) => {
    const classes = ["confirmation-control"];

    if (allocatedWidth > 0 && allocatedWidth <= 600) {
        classes.push("confirmation-control--mobile");
    } else if (allocatedWidth > 0 && allocatedWidth <= 900) {
        classes.push("confirmation-control--tablet");
    }

    if (allocatedHeight > 0 && allocatedHeight <= 640) {
        classes.push("confirmation-control--short");
    }

    return (
        <main className={classes.join(" ")}>
            <section className="confirmation-card" aria-labelledby="confirmation-title">
                <header className="confirmation-header">
                    <span className="confirmation-check" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path
                                d="M5 12.5L9.5 17L19 7.5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </span>
                    <h1 id="confirmation-title">Seats Booked Successfully!</h1>
                    <p>{assignments.length} employee bookings confirmed</p>
                    <BookingProgress activeStep={3} />
                </header>
                <div className="confirmation-assignment-list">
                    {assignments.map((assignment) => (
                        <article
                            className="confirmation-assignment"
                            key={assignment.bookingKey}
                        >
                            <div>
                                <h2>{assignment.employee.name}</h2>
                                <span>{assignment.employee.employeeId}</span>
                            </div>
                            <dl>
                                <div>
                                    <dt>Seat</dt>
                                    <dd>{assignment.seat.seatNumber}</dd>
                                </div>
                                <div>
                                    <dt>Date</dt>
                                    <dd>{bookingSelection.filters.date}</dd>
                                </div>
                                <div>
                                    <dt>Floor</dt>
                                    <dd>{assignment.seat.floor}</dd>
                                </div>
                                <div>
                                    <dt>Zone</dt>
                                    <dd>{assignment.seat.zone}</dd>
                                </div>
                            </dl>
                        </article>
                    ))}
                </div>
                <footer className="confirmation-actions">
                    <button
                        className="confirmation-secondary-button"
                        type="button"
                        onClick={onViewBookings}
                    >
                        View My Bookings
                    </button>
                    <PrimaryButton onClick={onBookAnother}>
                        Book Another Seat
                    </PrimaryButton>
                </footer>
            </section>
        </main>
    );
};
