import * as React from "react";

import { BackButton } from "./BackButton";
import ChevronIcon from "./assets/booking/chevron.svg";
import {
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
    isSeatExceptionActive
} from "./BookingModels";
import { EmployeeMultiSelect } from "./EmployeeMultiSelect";
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
}

export class BookSeatScreen extends React.PureComponent<
    IBookSeatScreenProps,
    IBookSeatScreenState
> {
    public state: IBookSeatScreenState = {
        date:
            this.props.initialSelection?.filters.date ??
            getDefaultBookingDate(),
        floor:
            this.props.initialSelection?.filters.floor ??
            this.props.seats[0]?.floor ??
            "",
        selectedEmployees:
            this.props.initialSelection?.employees ??
            (this.props.previewMode && this.props.employees[0]
                ? [this.props.employees[0]]
                : []),
        zone: this.props.initialSelection?.filters.zone ?? "All Zones"
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

        this.setState({ dateError, floorError, zoneError });

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
        const normalizedEmails = selectedEmployees
            .map((employee) => employee.email.trim().toLowerCase())
            .filter(Boolean);
        const duplicateEmails = normalizedEmails.filter(
            (email, index) => normalizedEmails.indexOf(email) !== index
        );
        const bookedEmployeeEmails = new Set(
            this.props.bookings
                .filter(
                    (booking) =>
                        booking.bookingDate === this.state.date &&
                        isActiveBooking(booking)
                )
                .map((booking) => booking.employeeEmail.trim().toLowerCase())
        );
        const alreadyBookedEmployees = selectedEmployees.filter((employee) =>
            bookedEmployeeEmails.has(employee.email.trim().toLowerCase())
        );

        if (selectedEmployees.length === 0) {
            errors.push("Select at least one employee.");
        }

        if (new Set(duplicateEmails).size > 0) {
            errors.push("The same employee cannot be selected more than once.");
        }

        if (selectedEmployees.some((employee) => !employee.email.trim())) {
            errors.push(
                "Employee email is required to complete a booking. Map EmployeeMail before continuing."
            );
        }

        if (alreadyBookedEmployees.length > 0) {
            errors.push(
                `${alreadyBookedEmployees
                    .map((employee) => employee.name)
                    .join(", ")} already booked a seat for this date.`
            );
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

    public render(): React.ReactNode {
        const { allocatedHeight, allocatedWidth } = this.props;
        const classes = ["book-seat-control"];
        const employeeErrors = this.getEmployeeErrors();
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
                            error={this.state.dateError}
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
                                        dateError: undefined
                                    })
                                }
                            />
                        </FormField>

                        <FormField
                            error={this.state.floorError}
                            htmlFor="booking-floor"
                            label="Select Floor"
                        >
                            <span className="booking-input-wrapper booking-select-wrapper">
                                <select
                                    aria-invalid={Boolean(this.state.floorError)}
                                    id="booking-floor"
                                    value={this.state.floor}
                                    onChange={(event) =>
                                        this.setState({
                                            floor: event.currentTarget.value,
                                            floorError: undefined,
                                            zone: "All Zones"
                                        })
                                    }
                                >
                                    <option value="">Select a floor</option>
                                    {floors.map((floor) => (
                                        <option key={floor} value={floor}>
                                            {floor}
                                        </option>
                                    ))}
                                </select>
                                <ChevronIcon aria-hidden="true" focusable="false" />
                            </span>
                        </FormField>

                        <FormField
                            error={this.state.zoneError}
                            htmlFor="booking-zone"
                            label="Select Zone"
                        >
                            <span className="booking-input-wrapper booking-select-wrapper">
                                <select
                                    aria-invalid={Boolean(this.state.zoneError)}
                                    id="booking-zone"
                                    value={this.state.zone}
                                    onChange={(event) =>
                                        this.setState({
                                            zone: event.currentTarget.value,
                                            zoneError: undefined
                                        })
                                    }
                                >
                                    <option value="All Zones">All Zones</option>
                                    {zones.map((zone) => (
                                        <option key={zone} value={zone}>
                                            {zone}
                                        </option>
                                    ))}
                                </select>
                                <ChevronIcon aria-hidden="true" focusable="false" />
                            </span>
                        </FormField>

                        <EmployeeMultiSelect
                            employees={this.props.employees}
                            maximum={Math.min(
                                this.props.maximumPeoplePerBooking,
                                availableSeatCount
                            )}
                            selectedEmployees={this.state.selectedEmployees}
                            onChange={(selectedEmployees) =>
                                this.setState({ selectedEmployees })
                            }
                        />
                        <section className="employee-selection" aria-label="Seat capacity">
                            <div className="booking-capacity">
                                <span>Seats required: {this.state.selectedEmployees.length}</span>
                                <span>Available: {availableSeatCount}</span>
                            </div>
                            {employeeErrors.map((error) => (
                                <p className="booking-field-error" key={error} role="alert">
                                    {error}
                                </p>
                            ))}
                        </section>

                        <PrimaryButton
                            disabled={employeeErrors.length > 0}
                            type="submit"
                        >
                            View Available Seats
                        </PrimaryButton>
                    </form>
                </section>
            </main>
        );
    }
}
