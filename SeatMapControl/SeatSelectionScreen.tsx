import * as React from "react";

import { BackButton } from "./BackButton";
import {
    IBookingActionRequest,
    IBookingActionResult,
    IBookingSelection,
    IEmployee,
    ISeat,
    ISeatAssignment,
    ISeatBooking,
    ISeatException,
    isActiveBooking,
    isSeatExceptionActive,
    isSelectedBooking,
    normalizeEmail
} from "./BookingModels";
import { BookingProgress, PrimaryButton } from "./BookingComponents";
import { ErrorDialog } from "./ErrorDialog";

type SeatStatus =
    | "available"
    | "selected"
    | "reserved"
    | "booked"
    | "blocked";

export interface ISeatSelectionScreenProps {
    actionResult?: IBookingActionResult;
    allocatedHeight: number;
    allocatedWidth: number;
    bookings: ISeatBooking[];
    bookingSelection: IBookingSelection;
    currentUserEmail: string;
    exceptions: ISeatException[];
    onActionRequest: (request: IBookingActionRequest) => void;
    onBack: () => void;
    onConfirmed: (assignments: ISeatAssignment[]) => void;
    seats: ISeat[];
}

type ReplacementStage =
    | "reserveNew"
    | "releaseOriginal"
    | "rollbackNew";

interface IReplacementContext {
    failureMessage?: string;
    newAssignment: ISeatAssignment;
    originalAssignment: ISeatAssignment;
    stage: ReplacementStage;
}

interface IPendingAction {
    assignments: ISeatAssignment[];
    navigateBack?: boolean;
    replacement?: IReplacementContext;
    request: IBookingActionRequest;
}

interface ISeatSelectionScreenState {
    assignments: ISeatAssignment[];
    now: number;
    pending?: IPendingAction;
    replacementTargetSeatKey?: string;
    selectionError?: string;
}

interface ISeatButtonProps {
    onClick: () => void;
    replacementTarget: boolean;
    seat: ISeat;
    status: SeatStatus;
}

const createRequestId = (): string =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const RESERVATION_DURATION_MS = 5 * 60 * 1000;
const RESERVATION_RESPONSE_TIMEOUT_MS = 10_000;
const RESERVATION_TIMEOUT_MESSAGE =
    "The seat reservation could not be completed. It may have been selected by another user. Please choose another seat.";

const createBookingKey = (
    date: string,
    seat: ISeat
): string =>
    [date, seat.floor, seat.zone, seat.seatNumber]
        .map((value) => value.trim().toLowerCase())
        .join("|");

const toRequestAssignment = (
    assignment: ISeatAssignment,
    date: string
): IBookingActionRequest["assignments"][number] => ({
    bookingDate: date,
    bookingId: assignment.bookingId,
    bookingKey: assignment.bookingKey,
    employeeId: assignment.employee.employeeId,
    employeeName: assignment.employee.name,
    expiresAt: assignment.expiresAt,
    floor: assignment.seat.floor,
    seatKey: assignment.seat.seatKey,
    seatNumber: assignment.seat.seatNumber,
    zone: assignment.seat.zone
});

const SeatButton: React.FC<ISeatButtonProps> = ({
    onClick,
    replacementTarget,
    seat,
    status
}) => (
    <button
        className={`seat-button seat-button--${status}${
            replacementTarget ? " seat-button--replacement-target" : ""
        }`}
        disabled={
            status === "reserved" ||
            status === "booked" ||
            status === "blocked"
        }
        type="button"
        aria-label={`${seat.seatNumber}, ${status}`}
        aria-pressed={status === "selected"}
        onClick={onClick}
    >
        {seat.seatNumber}
    </button>
);

const SeatLegend: React.FC = () => (
    <ul className="seat-legend" aria-label="Seat status legend">
        {(
            [
                "available",
                "selected",
                "reserved",
                "booked",
                "blocked"
            ] as SeatStatus[]
        ).map((status) => (
            <li key={status}>
                <span className={`seat-legend-dot seat-legend-dot--${status}`} />
                <span>{status[0].toUpperCase() + status.slice(1)}</span>
            </li>
        ))}
    </ul>
);

export class SeatSelectionScreen extends React.PureComponent<
    ISeatSelectionScreenProps,
    ISeatSelectionScreenState
> {
    private timer?: number;
    private reservationResponseTimer?: number;

    public state: ISeatSelectionScreenState = {
        assignments: this.getRestoredAssignments(),
        now: Date.now()
    };

    public componentDidMount(): void {
        this.timer = window.setInterval(() => {
            this.setState({ now: Date.now() }, this.releaseExpiredAssignments);
        }, 1000);
    }

    public componentDidUpdate(
        previousProps: ISeatSelectionScreenProps
    ): void {
        if (
            this.props.actionResult &&
            this.props.actionResult !== previousProps.actionResult
        ) {
            this.applyActionResult(this.props.actionResult);
        }
    }

    public componentWillUnmount(): void {
        if (this.timer !== undefined) {
            window.clearInterval(this.timer);
        }

        this.clearReservationResponseTimer();
    }

    private getRestoredAssignments(): ISeatAssignment[] {
        const currentEmail = normalizeEmail(this.props.currentUserEmail);
        const date = this.props.bookingSelection.filters.date;

        return this.props.bookings
            .filter(
                (booking) =>
                    booking.bookingDate === date &&
                    isSelectedBooking(booking) &&
                    normalizeEmail(booking.createdByEmail) === currentEmail
            )
            .reduce<ISeatAssignment[]>((assignments, booking) => {
                const seat = this.props.seats.find(
                    (candidate) => candidate.seatKey === booking.seatKey
                );
                const employee = this.props.bookingSelection.employees.find(
                    (candidate) =>
                        normalizeEmail(candidate.email) ===
                        normalizeEmail(booking.employeeEmail)
                );

                if (!seat || !employee) {
                    return assignments;
                }

                assignments.push({
                    bookingId: booking.bookingId,
                    bookingKey: booking.bookingKey,
                    employee,
                    expiresAt:
                        booking.expiresAt ??
                        new Date(Date.now() + RESERVATION_DURATION_MS).toISOString(),
                    seat
                });

                return assignments;
            }, []);
    }

    private getFilteredSeats(): ISeat[] {
        const { floor, zone } = this.props.bookingSelection.filters;

        return this.props.seats
            .filter(
                (seat) =>
                    seat.floor === floor &&
                    (zone === "All Zones" || seat.zone === zone)
            )
            .sort((left, right) =>
                left.seatNumber.localeCompare(right.seatNumber, undefined, {
                    numeric: true
                })
            );
    }

    private getSeatBooking(seatKey: string): ISeatBooking | undefined {
        const bookingDate = this.props.bookingSelection.filters.date;

        return this.props.bookings.find(
            (booking) =>
                booking.bookingDate === bookingDate &&
                booking.seatKey === seatKey &&
                isActiveBooking(booking)
        );
    }

    private getSeatStatus(seat: ISeat): SeatStatus {
        if (
            this.props.exceptions.some(
                (exception) =>
                    exception.seatKey === seat.seatKey &&
                    isSeatExceptionActive(
                        exception,
                        this.props.bookingSelection.filters.date
                    )
            )
        ) {
            return "blocked";
        }

        if (
            this.state.assignments.some(
                (assignment) => assignment.seat.seatKey === seat.seatKey
            )
        ) {
            return "selected";
        }

        const booking = this.getSeatBooking(seat.seatKey);

        if (!booking) {
            return "available";
        }

        if (isSelectedBooking(booking)) {
            return normalizeEmail(booking.createdByEmail) ===
                normalizeEmail(this.props.currentUserEmail)
                ? "selected"
                : "reserved";
        }

        return "booked";
    }

    private getNextUnassignedEmployee(): IEmployee | undefined {
        const assignedEmployeeIds = new Set(
            this.state.assignments.map((assignment) =>
                assignment.employee.employeeId.trim().toLowerCase()
            )
        );

        return this.props.bookingSelection.employees.find(
            (employee) =>
                !assignedEmployeeIds.has(
                    employee.employeeId.trim().toLowerCase()
                )
        );
    }

    private readonly toggleSeat = (seat: ISeat): void => {
        if (this.state.pending) {
            return;
        }

        const existing = this.state.assignments.find(
            (assignment) => assignment.seat.seatKey === seat.seatKey
        );

        if (existing) {
            if (
                this.state.replacementTargetSeatKey ===
                existing.seat.seatKey
            ) {
                this.setState(
                    { replacementTargetSeatKey: undefined },
                    () => this.requestAction("release", [existing])
                );
                return;
            }

            this.setState({
                replacementTargetSeatKey: existing.seat.seatKey,
                selectionError: undefined
            });
            return;
        }

        const selectedReplacementTarget = this.state.assignments.find(
            (assignment) =>
                assignment.seat.seatKey ===
                this.state.replacementTargetSeatKey
        );
        const replacementOriginal =
            selectedReplacementTarget ??
            (this.props.bookingSelection.employees.length === 1 &&
            this.state.assignments.length === 1
                ? this.state.assignments[0]
                : undefined);
        const employee =
            replacementOriginal?.employee ??
            this.getNextUnassignedEmployee();

        if (!employee) {
            this.setState({
                selectionError:
                    "Select an assigned seat first to choose which employee needs a different seat."
            });
            return;
        }

        const assignment: ISeatAssignment = {
            bookingKey: createBookingKey(
                this.props.bookingSelection.filters.date,
                seat
            ),
            employee,
            expiresAt: new Date(
                Date.now() + RESERVATION_DURATION_MS
            ).toISOString(),
            seat
        };

        if (replacementOriginal) {
            this.requestAction("reserve", [assignment], false, {
                newAssignment: assignment,
                originalAssignment: replacementOriginal,
                stage: "reserveNew"
            });
            return;
        }

        this.requestAction("reserve", [assignment]);
    };

    private requestAction(
        action: IBookingActionRequest["action"],
        assignments: ISeatAssignment[],
        navigateBack = false,
        replacement?: IReplacementContext
    ): void {
        const request: IBookingActionRequest = {
            action,
            assignments: assignments.map((assignment) =>
                toRequestAssignment(
                    assignment,
                    this.props.bookingSelection.filters.date
                )
            ),
            requestId: createRequestId()
        };

        this.setState({
            pending: { assignments, navigateBack, replacement, request },
            selectionError: undefined
        });

        if (action === "reserve") {
            this.startReservationResponseTimer(request.requestId);
        }

        this.props.onActionRequest(request);
    }

    private startReservationResponseTimer(requestId: string): void {
        this.clearReservationResponseTimer();
        this.reservationResponseTimer = window.setTimeout(() => {
            this.reservationResponseTimer = undefined;
            this.setState((state) => {
                if (
                    !state.pending ||
                    state.pending.request.action !== "reserve" ||
                    state.pending.request.requestId !== requestId
                ) {
                    return null;
                }

                return {
                    pending: undefined,
                    selectionError: RESERVATION_TIMEOUT_MESSAGE
                };
            });
        }, RESERVATION_RESPONSE_TIMEOUT_MS);
    }

    private clearReservationResponseTimer(): void {
        if (this.reservationResponseTimer !== undefined) {
            window.clearTimeout(this.reservationResponseTimer);
            this.reservationResponseTimer = undefined;
        }
    }

    private applyActionResult(result: IBookingActionResult): void {
        const pending = this.state.pending;

        if (!pending || pending.request.requestId !== result.requestId) {
            return;
        }

        this.clearReservationResponseTimer();

        if (!result.success) {
            const errorMessage =
                result.error ??
                "The booking action could not be completed. Refresh and try again.";

            if (pending.replacement?.stage === "releaseOriginal") {
                const replacement = pending.replacement;

                this.setState({ pending: undefined }, () =>
                    this.requestAction(
                        "release",
                        [replacement.newAssignment],
                        false,
                        {
                            ...replacement,
                            failureMessage: errorMessage,
                            stage: "rollbackNew"
                        }
                    )
                );
                return;
            }

            if (pending.replacement?.stage === "rollbackNew") {
                this.setState({
                    pending: undefined,
                    replacementTargetSeatKey:
                        pending.replacement.originalAssignment.seat.seatKey,
                    selectionError: `${
                        pending.replacement.failureMessage ?? errorMessage
                    } The replacement reservation could not be released automatically. Refresh before continuing.`
                });
                return;
            }

            this.setState({
                pending: undefined,
                selectionError: errorMessage
            });
            return;
        }

        if (result.action === "reserve") {
            const record = result.records?.[0];
            const assignment = pending.assignments[0];
            const resolvedAssignment: ISeatAssignment = {
                ...assignment,
                bookingId: record?.bookingId,
                bookingKey: record?.bookingKey ?? assignment.bookingKey,
                expiresAt: record?.expiresAt ?? assignment.expiresAt
            };

            if (pending.replacement?.stage === "reserveNew") {
                const originalAssignment =
                    pending.replacement.originalAssignment;

                this.setState({ pending: undefined }, () =>
                    this.requestAction(
                        "release",
                        [originalAssignment],
                        false,
                        {
                            newAssignment: resolvedAssignment,
                            originalAssignment,
                            stage: "releaseOriginal"
                        }
                    )
                );
                return;
            }

            this.setState({
                assignments: [
                    ...this.state.assignments,
                    resolvedAssignment
                ],
                pending: undefined
            });
            return;
        }

        if (
            result.action === "release" ||
            result.action === "releaseGroup"
        ) {
            if (pending.replacement?.stage === "releaseOriginal") {
                const replacement = pending.replacement;

                this.setState((state) => ({
                    assignments: state.assignments.map((assignment) =>
                        assignment.seat.seatKey ===
                        replacement.originalAssignment.seat.seatKey
                            ? replacement.newAssignment
                            : assignment
                    ),
                    pending: undefined,
                    replacementTargetSeatKey: undefined
                }));
                return;
            }

            if (pending.replacement?.stage === "rollbackNew") {
                this.setState({
                    pending: undefined,
                    replacementTargetSeatKey:
                        pending.replacement.originalAssignment.seat.seatKey,
                    selectionError:
                        pending.replacement.failureMessage ??
                        "The seat could not be changed. Your original seat remains selected."
                });
                return;
            }

            const releasedSeatKeys = new Set(
                pending.assignments.map(
                    (assignment) => assignment.seat.seatKey
                )
            );
            const navigateBack = pending.navigateBack;

            this.setState(
                (state) => ({
                    assignments: state.assignments.filter(
                        (assignment) =>
                            !releasedSeatKeys.has(assignment.seat.seatKey)
                    ),
                    pending: undefined,
                    replacementTargetSeatKey: releasedSeatKeys.has(
                        state.replacementTargetSeatKey ?? ""
                    )
                        ? undefined
                        : state.replacementTargetSeatKey
                }),
                navigateBack ? this.props.onBack : undefined
            );
            return;
        }

        if (result.action === "confirmGroup") {
            const assignments = this.state.assignments;

            this.setState({ pending: undefined }, () =>
                this.props.onConfirmed(assignments)
            );
        }
    }

    private readonly releaseExpiredAssignments = (): void => {
        if (this.state.pending) {
            return;
        }

        const expired = this.state.assignments.filter(
            (assignment) =>
                new Date(assignment.expiresAt).getTime() <= this.state.now
        );

        if (expired.length > 0) {
            this.requestAction("releaseGroup", expired);
        }
    };

    private readonly handleBack = (): void => {
        if (this.state.pending) {
            return;
        }

        if (this.state.assignments.length === 0) {
            this.props.onBack();
            return;
        }

        this.requestAction("releaseGroup", this.state.assignments, true);
    };

    private readonly handleConfirm = (): void => {
        if (
            !this.state.pending &&
            this.state.assignments.length ===
                this.props.bookingSelection.employees.length
        ) {
            this.requestAction("confirmGroup", this.state.assignments);
        }
    };

    public render(): React.ReactNode {
        const { allocatedHeight, allocatedWidth, bookingSelection } = this.props;
        const classes = ["seat-selection-control"];
        const seats = this.getFilteredSeats();
        const requiredCount = bookingSelection.employees.length;
        const selectedCount = this.state.assignments.length;
        const nextEmployee = this.getNextUnassignedEmployee();
        const replacementTarget =
            this.state.assignments.find(
                (assignment) =>
                    assignment.seat.seatKey ===
                    this.state.replacementTargetSeatKey
            ) ?? this.state.pending?.replacement?.originalAssignment;
        const earliestExpiry = this.state.assignments.reduce(
            (earliest, assignment) =>
                Math.min(
                    earliest,
                    new Date(assignment.expiresAt).getTime()
                ),
            Number.POSITIVE_INFINITY
        );
        const remainingSeconds = Number.isFinite(earliestExpiry)
            ? Math.max(0, Math.ceil((earliestExpiry - this.state.now) / 1000))
            : 0;

        if (allocatedWidth > 0 && allocatedWidth <= 600) {
            classes.push("seat-selection-control--mobile");
        } else if (allocatedWidth > 0 && allocatedWidth <= 900) {
            classes.push("seat-selection-control--tablet");
        }

        if (allocatedHeight > 0 && allocatedHeight <= 640) {
            classes.push("seat-selection-control--short");
        }

        return (
            <main className={classes.join(" ")}>
                <section className="seat-map-card" aria-labelledby="seat-map-title">
                    <header className="seat-map-header">
                        <div className="seat-map-title-row">
                            <BackButton
                                label="Back to booking filters"
                                onClick={this.handleBack}
                            />
                            <h1 id="seat-map-title">
                                Seat Map - {bookingSelection.filters.floor}
                            </h1>
                        </div>
                        <BookingProgress activeStep={2} />
                    </header>
                    <SeatLegend />
                    <div className="seat-assignment-status">
                        <div>
                            <strong>
                                {selectedCount} of {requiredCount} seats selected
                            </strong>
                            <span>
                                {replacementTarget
                                    ? `Changing seat for ${replacementTarget.employee.name} (${replacementTarget.employee.employeeId})`
                                    : nextEmployee
                                      ? `Selecting for ${nextEmployee.name} (${nextEmployee.employeeId})`
                                      : "All employees have a seat. Select an assigned seat to change it."}
                            </span>
                        </div>
                        {remainingSeconds > 0 ? (
                            <span className="reservation-timer">
                                Reserved for{" "}
                                {String(Math.floor(remainingSeconds / 60)).padStart(
                                    2,
                                    "0"
                                )}
                                :
                                {String(remainingSeconds % 60).padStart(2, "0")}
                            </span>
                        ) : null}
                    </div>
                    <div className="seat-grid-scroll" tabIndex={0}>
                        <div className="seat-grid">
                            {seats.map((seat) => (
                                <SeatButton
                                    key={seat.seatKey}
                                    replacementTarget={
                                        replacementTarget?.seat.seatKey ===
                                        seat.seatKey
                                    }
                                    seat={seat}
                                    status={this.getSeatStatus(seat)}
                                    onClick={() => this.toggleSeat(seat)}
                                />
                            ))}
                        </div>
                    </div>
                    {seats.length === 0 ? (
                        <p className="seat-map-empty">
                            No seats are configured for these filters.
                        </p>
                    ) : null}
                    {this.state.pending ? (
                        <p className="seat-map-pending" role="status">
                            {this.state.pending.replacement
                                ? "Changing seat..."
                                : this.state.pending.request.action === "reserve"
                                  ? "Processing reservation..."
                                  : "Processing booking update..."}
                        </p>
                    ) : null}
                    <footer className="seat-map-footer">
                        <div>
                            <span>Total Seats: {seats.length}</span>
                            <small>
                                Required: {requiredCount} | Selected: {selectedCount}
                            </small>
                        </div>
                        <PrimaryButton
                            disabled={
                                Boolean(this.state.pending) ||
                                requiredCount === 0 ||
                                selectedCount !== requiredCount
                            }
                            onClick={this.handleConfirm}
                        >
                            Confirm Selection
                        </PrimaryButton>
                    </footer>
                </section>
                <ErrorDialog
                    message={this.state.selectionError}
                    onDismiss={() => this.setState({ selectionError: undefined })}
                />
            </main>
        );
    }
}
