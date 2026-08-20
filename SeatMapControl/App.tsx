import * as React from "react";

import { BookSeatScreen } from "./BookSeatScreen";
import { BookingConfirmationScreen } from "./BookingConfirmationScreen";
import { CancelBookingScreen } from "./CancelBookingScreen";
import {
    IBookingActionRequest,
    IBookingActionResult,
    IBookingSelection,
    IEmployee,
    ISeat,
    ISeatAssignment,
    ISeatBooking,
    ISeatException
} from "./BookingModels";
import { HomeScreen } from "./HomeScreen";
import { LoginScreen } from "./LoginScreen";
import { SeatSelectionScreen } from "./SeatSelectionScreen";

export interface IAppProps {
    actionResult?: IBookingActionResult;
    allocatedHeight: number;
    allocatedWidth: number;
    bookings: ISeatBooking[];
    canBookForAnyone: boolean;
    canCreateBookings: boolean;
    cancelBookingVisibleRecordCount?: number;
    currentUserEmail: string;
    employees: IEmployee[];
    exceptions: ISeatException[];
    maximumPeoplePerBooking: number;
    onActionRequest: (request: IBookingActionRequest) => void;
    previewMode: boolean;
    seats: ISeat[];
}

interface IAppState {
    isSignedIn: boolean;
    bookingSelection?: IBookingSelection;
    confirmedAssignments?: ISeatAssignment[];
    previewActionResult?: IBookingActionResult;
    screen: "home" | "bookSeat" | "seatSelection" | "confirmation" | "cancelBooking";
}

export class App extends React.PureComponent<IAppProps, IAppState> {
    public state: IAppState = {
        isSignedIn: false,
        screen: "home"
    };

    private readonly handleSignIn = (): void => {
        if (!this.props.currentUserEmail.trim()) {
            return;
        }

        this.setState({ isSignedIn: true, screen: "home" });
    };

    private readonly handleBookSeat = (): void => {
        this.setState({ screen: "bookSeat" });
    };

    private readonly handleCancelBooking = (): void => {
        this.setState({ screen: "cancelBooking" });
    };

    private readonly handleBackToHome = (): void => {
        this.setState({ screen: "home" });
    };

    private readonly handleContinueToSeats = (
        bookingSelection: IBookingSelection
    ): void => {
        this.setState({ bookingSelection, screen: "seatSelection" });
    };

    private readonly handleBackToFilters = (): void => {
        this.setState({ screen: "bookSeat" });
    };

    private readonly handleConfirmed = (
        confirmedAssignments: ISeatAssignment[]
    ): void => {
        this.setState({
            confirmedAssignments,
            screen: "confirmation"
        });
    };

    private readonly handleBookAnother = (): void => {
        this.setState({
            bookingSelection: undefined,
            confirmedAssignments: undefined,
            screen: "bookSeat"
        });
    };

    private readonly handleViewBookings = (): void => {
        this.setState({ screen: "home" });
    };

    private readonly handleActionRequest = (
        request: IBookingActionRequest
    ): void => {
        if (!this.props.previewMode) {
            this.props.onActionRequest(request);
            return;
        }

        window.setTimeout(() => {
            this.setState({
                previewActionResult: {
                    action: request.action,
                    records: request.assignments.map((assignment, index) => ({
                        bookingId:
                            assignment.bookingId ??
                            `preview-${Date.now()}-${index}`,
                        bookingKey: assignment.bookingKey,
                        expiresAt: assignment.expiresAt,
                        seatKey: assignment.seatKey
                    })),
                    requestId: request.requestId,
                    success: true
                }
            });
        }, 150);
    };

    public render(): React.ReactNode {
        const {
            allocatedHeight,
            allocatedWidth,
            bookings,
            canBookForAnyone,
            canCreateBookings,
            cancelBookingVisibleRecordCount,
            currentUserEmail,
            employees,
            exceptions,
            maximumPeoplePerBooking,
            previewMode,
            seats
        } = this.props;
        const currentEmail = currentUserEmail.trim().toLowerCase();
        const hasEmployeeRelationshipData = employees.some(
            (employee) =>
                Boolean(employee.email.trim()) ||
                Boolean(employee.managerEmail.trim())
        );
        const selectableEmployees =
            canBookForAnyone || !hasEmployeeRelationshipData
            ? employees
            : employees.filter(
                  (employee) =>
                      employee.email.trim().toLowerCase() === currentEmail ||
                      employee.managerEmail.trim().toLowerCase() === currentEmail
              );

        if (this.state.isSignedIn) {
            if (
                this.state.screen === "confirmation" &&
                this.state.bookingSelection &&
                this.state.confirmedAssignments
            ) {
                return (
                    <BookingConfirmationScreen
                        allocatedHeight={allocatedHeight}
                        allocatedWidth={allocatedWidth}
                        assignments={this.state.confirmedAssignments}
                        bookingSelection={this.state.bookingSelection}
                        onBookAnother={this.handleBookAnother}
                        onViewBookings={this.handleViewBookings}
                    />
                );
            }

            if (
                this.state.screen === "seatSelection" &&
                this.state.bookingSelection
            ) {
                return (
                    <SeatSelectionScreen
                        allocatedHeight={allocatedHeight}
                        allocatedWidth={allocatedWidth}
                        actionResult={
                            previewMode
                                ? this.state.previewActionResult
                                : this.props.actionResult
                        }
                        bookings={bookings}
                        bookingSelection={this.state.bookingSelection}
                        currentUserEmail={currentUserEmail}
                        exceptions={exceptions}
                        onActionRequest={this.handleActionRequest}
                        onBack={this.handleBackToFilters}
                        onConfirmed={this.handleConfirmed}
                        seats={seats}
                    />
                );
            }

            if (this.state.screen === "bookSeat") {
                return (
                    <BookSeatScreen
                        allocatedHeight={allocatedHeight}
                        allocatedWidth={allocatedWidth}
                        bookings={bookings}
                        employees={selectableEmployees}
                        exceptions={exceptions}
                        initialSelection={this.state.bookingSelection}
                        maximumPeoplePerBooking={maximumPeoplePerBooking}
                        onBack={this.handleBackToHome}
                        onContinue={this.handleContinueToSeats}
                        previewMode={previewMode}
                        seats={seats}
                    />
                );
            }

            if (this.state.screen === "cancelBooking") {
                return <CancelBookingScreen allocatedHeight={allocatedHeight} allocatedWidth={allocatedWidth} bookings={bookings} currentUserEmail={currentUserEmail} visibleRecordCount={cancelBookingVisibleRecordCount} onActionRequest={this.handleActionRequest} onBack={this.handleBackToHome} />;
            }

            return (
                <HomeScreen
                    allocatedHeight={allocatedHeight}
                    allocatedWidth={allocatedWidth}
                    canCreateBookings={canCreateBookings}
                    onCancelBooking={this.handleCancelBooking}
                    onBookSeat={this.handleBookSeat}
                />
            );
        }

        return (
            <LoginScreen
                allocatedHeight={allocatedHeight}
                allocatedWidth={allocatedWidth}
                currentUserEmail={currentUserEmail}
                onSignIn={this.handleSignIn}
            />
        );
    }
}
