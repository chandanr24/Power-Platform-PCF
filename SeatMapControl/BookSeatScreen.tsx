import * as React from "react";

import { BackButton } from "./BackButton";
import {
    BookingDropdown,
    BookingProgress,
    FormField,
    PrimaryButton
} from "./BookingComponents";
import {
    IBookingSelection,
    IEmployee,
    ISeat,
    ISeatBooking,
    ISeatException,
    isActiveBooking,
    isSeatExceptionActive,
    normalizeEmail,
    normalizeEmployeeId
} from "./BookingModels";
import { EmployeeMultiSelect } from "./EmployeeMultiSelect";
import { ErrorDialog } from "./ErrorDialog";
import {
    WorkingDayCalendar,
    getDefaultBookingDate,
    isSelectableBookingDate
} from "./WorkingDayCalendar";

export interface IBookSeatScreenProps {
    allocatedHeight: number;
    allocatedWidth: number;
    bookings: ISeatBooking[];
    employees: IEmployee[];
    exceptions: ISeatException[];
    initialSelection?: IBookingSelection;
    maximumPeoplePerBooking: number;
    onBack: () => void;
    onContinue: (selection: IBookingSelection) => void;
    previewMode: boolean;
    seats: ISeat[];
}

interface IBookSeatScreenState {
    date: string;
    dateError?: string;
    floor: string;
    floorError?: string;
    selectedEmployees: IEmployee[];
    zone: string;
    zoneError?: string;
    errorMessage?: string;
}

export class BookSeatScreen extends React.PureComponent<
    IBookSeatScreenProps,
    IBookSeatScreenState
> {
    public state: IBookSeatScreenState = {
        date:
            this.props.initialSelection?.filters.date ??
            getDefaultBookingDate(),
        floor: this.props.initialSelection?.filters.floor ?? "",
        selectedEmployees:
            this.props.initialSelection?.employees ??
            (this.props.previewMode && this.props.employees[0]
                ? [this.props.employees[0]]
                : []),
        zone:
            this.props.initialSelection?.filters.zone === "All Zones"
                ? ""
                : this.props.initialSelection?.filters.zone ?? ""
    };

    private readonly handleSubmit = (
        event: React.FormEvent<HTMLFormElement>
    ): void => {
        event.preventDefault();

        const dateError =
            !this.props.previewMode &&
            !isSelectableBookingDate(this.state.date)
                ? "Select a weekday within the next 60 working days."
                : undefined;
        const floorError = this.state.floor ? undefined : "Select a floor.";
        const zoneError = this.state.zone ? undefined : "Select a zone.";
        const employeeErrors = this.getEmployeeErrors();
        const alreadyBookedMessage = this.getAlreadyBookedMessage();

        const validationErrors = [
            ...(dateError ? [dateError] : []),
            ...(floorError ? [floorError] : []),
            ...(zoneError ? [zoneError] : []),
            ...employeeErrors.filter((error) => error !== alreadyBookedMessage)
        ];

        this.setState({
            dateError,
            floorError,
            zoneError,
            errorMessage: validationErrors.length
                ? validationErrors.join("\n")
                : undefined
        });

        if (
            !dateError &&
            !floorError &&
            !zoneError &&
            employeeErrors.length === 0
        ) {
            this.props.onContinue({
                employees: this.state.selectedEmployees,
                filters: {
                    date: this.state.date,
                    floor: this.state.floor,
                    zone: this.state.zone
                }
            });
        }
    };

    private getAvailableSeatCount(): number {
        const bookedSeatKeys = new Set(
            this.props.bookings
                .filter(
                    (booking) =>
                        booking.bookingDate === this.state.date &&
                        isActiveBooking(booking)
                )
                .map((booking) => booking.seatKey)
        );

        return this.props.seats.filter(
            (seat) =>
                seat.floor === this.state.floor &&
                (this.state.zone === "All Zones" ||
                    seat.zone === this.state.zone) &&
                !this.props.exceptions.some(
                    (exception) =>
                        exception.seatKey === seat.seatKey &&
                        isSeatExceptionActive(exception, this.state.date)
                ) &&
                !bookedSeatKeys.has(seat.seatKey)
        ).length;
    }

    private getEmployeeErrors(): string[] {
        if (this.props.previewMode) {
            return [];
        }

        const { maximumPeoplePerBooking } = this.props;
        const { selectedEmployees } = this.state;
        const availableSeatCount = this.getAvailableSeatCount();
        const errors: string[] = [];
        const normalizedEmployeeIds = selectedEmployees
            .map((employee) => normalizeEmployeeId(employee.employeeId))
            .filter(Boolean);
        const duplicateEmployeeIds = normalizedEmployeeIds.filter(
            (employeeId, index) =>
                normalizedEmployeeIds.indexOf(employeeId) !== index
        );
        const alreadyBookedMessage = this.getAlreadyBookedMessage();

        if (selectedEmployees.length === 0) {
            errors.push("Select at least one employee.");
        }

        if (new Set(duplicateEmployeeIds).size > 0) {
            errors.push("The same employee cannot be selected more than once.");
        }

        if (
            selectedEmployees.some(
                (employee) => !normalizeEmployeeId(employee.employeeId)
            )
        ) {
            errors.push("Employee ID is required to complete a booking.");
        }

        if (alreadyBookedMessage) {
            errors.push(alreadyBookedMessage);
        }

        if (selectedEmployees.length > maximumPeoplePerBooking) {
            errors.push(
                `A maximum of ${maximumPeoplePerBooking} employees can be booked at once.`
            );
        }

        if (selectedEmployees.length > availableSeatCount) {
            errors.push(
                `Only ${availableSeatCount} seats are currently available.`
            );
        }

        return errors;
    }

    private getAlreadyBookedMessage(): string | undefined {
        if (this.props.previewMode) {
            return undefined;
        }

        const activeBookings = this.props.bookings.filter(
            (booking) =>
                booking.bookingDate === this.state.date &&
                isActiveBooking(booking)
        );
        const bookedEmployeeIds = new Set(
            activeBookings
                .map((booking) => normalizeEmployeeId(booking.employeeId))
                .filter(Boolean)
        );
        const legacyBookedEmployeeEmails = new Set(
            activeBookings
                .filter((booking) => !normalizeEmployeeId(booking.employeeId))
                .map((booking) => normalizeEmail(booking.employeeEmail))
                .filter(Boolean)
        );
        const alreadyBookedEmployees = this.state.selectedEmployees.filter(
            (employee) =>
                bookedEmployeeIds.has(
                    normalizeEmployeeId(employee.employeeId)
                ) ||
                (Boolean(normalizeEmail(employee.email)) &&
                    legacyBookedEmployeeEmails.has(
                        normalizeEmail(employee.email)
                    ))
        );

        return alreadyBookedEmployees.length > 0
            ? `${alreadyBookedEmployees
                  .map((employee) => employee.name)
                  .join(", ")} already booked a seat for this date.`
            : undefined;
    }
    public render(): React.ReactNode {
        const { allocatedHeight, allocatedWidth } = this.props;
        const classes = ["book-seat-control"];
        const employeeErrors = this.getEmployeeErrors();
        const alreadyBookedMessage = this.getAlreadyBookedMessage();
        const dateInvalid =
            !this.props.previewMode &&
            !isSelectableBookingDate(this.state.date);
        const availableSeatCount = this.getAvailableSeatCount();
        const floors = Array.from(
            new Set(this.props.seats.map((seat) => seat.floor).filter(Boolean))
        ).sort();
        const zones = Array.from(
            new Set(
                this.props.seats
                    .filter((seat) => seat.floor === this.state.floor)
                    .map((seat) => seat.zone)
                    .filter(Boolean)
            )
        ).sort();
        const employeeSelectionBlockedMessage =
            !this.state.floor && !this.state.zone
                ? "Floor and zone need to be selected."
                : !this.state.floor
                  ? "Floor needs to be selected."
                  : !this.state.zone
                    ? "Zone needs to be selected."
                    : availableSeatCount <= 0
                      ? "No seats are available for the selected floor and zone."
                      : undefined;

        if (allocatedWidth > 0 && allocatedWidth <= 600) {
            classes.push("book-seat-control--mobile");
        } else if (allocatedWidth > 0 && allocatedWidth <= 900) {
            classes.push("book-seat-control--tablet");
        }

        if (allocatedHeight > 0 && allocatedHeight <= 640) {
            classes.push("book-seat-control--short");
        }

        return (
            <main className={classes.join(" ")}>
                <section className="booking-card" aria-labelledby="book-seat-title">
                    <header className="booking-header">
                        <div className="booking-title-row">
                            <BackButton
                                label="Back to Home"
                                onClick={this.props.onBack}
                            />
                            <h1 id="book-seat-title">Book Seat</h1>
                        </div>
                        <BookingProgress activeStep={1} />
                    </header>

                    <form className="booking-form" noValidate onSubmit={this.handleSubmit}>
                        <FormField
                            htmlFor="booking-date"
                            label="Select Date"
                        >
                            <WorkingDayCalendar
                                id="booking-date"
                                invalid={Boolean(this.state.dateError)}
                                value={this.state.date}
                                onChange={(date) =>
                                    this.setState({
                                        date,
                                        dateError: undefined,
                                        errorMessage: undefined
                                    })
                                }
                            />
                        </FormField>

                        <FormField
                            htmlFor="booking-floor"
                            label="Select Floor"
                        >
                            <BookingDropdown
                                id="booking-floor"
                                invalid={Boolean(this.state.floorError)}
                                options={floors}
                                placeholder="Select a floor"
                                value={this.state.floor}
                                onChange={(floor) =>
                                    this.setState({
                                        floor,
                                        floorError: undefined,
                                        zone: "",
                                        errorMessage: undefined
                                    })
                                }
                            />
                        </FormField>

                        <FormField
                            htmlFor="booking-zone"
                            label="Select Zone"
                        >
                            <BookingDropdown
                                disabled={!this.state.floor}
                                id="booking-zone"
                                invalid={Boolean(this.state.zoneError)}
                                options={zones}
                                placeholder="Select a zone"
                                value={this.state.zone}
                                onChange={(zone) =>
                                    this.setState({
                                        zone,
                                        zoneError: undefined,
                                        errorMessage: undefined
                                    })
                                }
                            />
                        </FormField>

                        <EmployeeMultiSelect
                            employees={this.props.employees}
                            maximum={Math.min(
                                this.props.maximumPeoplePerBooking,
                                availableSeatCount
                            )}
                            selectedEmployees={this.state.selectedEmployees}
                            selectionBlockedMessage={employeeSelectionBlockedMessage}
                            onChange={(selectedEmployees) =>
                                this.setState({
                                    selectedEmployees,
                                    errorMessage: undefined
                                })
                            }
                        />
                        <section className="employee-selection" aria-label="Seat capacity">
                            <div className="booking-capacity">
                                <span>Seats required: {this.state.selectedEmployees.length}</span>
                                <span>Available: {availableSeatCount}</span>
                            </div>
                            {alreadyBookedMessage ? (
                                <p className="booking-field-error" role="alert">
                                    {alreadyBookedMessage}
                                </p>
                            ) : null}
                        </section>

                        <PrimaryButton
                            disabled={
                                dateInvalid ||
                                !this.state.floor ||
                                !this.state.zone ||
                                employeeErrors.length > 0
                            }
                            type="submit"
                        >
                            View Available Seats
                        </PrimaryButton>
                    </form>
                </section>
                <ErrorDialog
                    message={this.state.errorMessage}
                    onDismiss={() => this.setState({ errorMessage: undefined })}
                />
            </main>
        );
    }
}
