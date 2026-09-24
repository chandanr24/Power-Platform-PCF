import * as React from "react";

import { BookSeatScreen } from "./BookSeatScreen";
import { BookingConfirmationScreen } from "./BookingConfirmationScreen";
import { CancelBookingScreen } from "./CancelBookingScreen";
import {
    IBookingActionRequest,
    IBookingActionResult,
    IBookingAccess,
    IBookingSelection,
    IEmployee,
    IMeetingRoom,
    IMeetingRoomActionRequest,
    IMeetingRoomActionResult,
    IMeetingRoomBooking,
    ISeat,
    ISeatAssignment,
    ISeatBooking,
    ISeatException
} from "./BookingModels";
import { HomeScreen } from "./HomeScreen";
import { ErrorDialog } from "./ErrorDialog";
import { LoginScreen } from "./LoginScreen";
import { MeetingRoomBookingScreen } from "./MeetingRoomBookingScreen";
import { MyBookingsScreen } from "./MyBookingsScreen";
import { SeatSelectionScreen } from "./SeatSelectionScreen";

export interface IAppProps {
    actionResult?: IBookingActionResult;
    allocatedHeight: number;
    allocatedWidth: number;
    bookingAccess: IBookingAccess[];
    bookings: ISeatBooking[];
    myBookings: ISeatBooking[];
    myBookingsPageSize?: number;
    canBookForAnyone: boolean;
    canBookMeetingRooms: boolean;
    canCreateBookings: boolean;
    cancelBookingVisibleRecordCount?: number;
    currentUserEmail: string;
    currentUserEmployeeCode: string;
    employees: IEmployee[];
    exceptions: ISeatException[];
    maximumPeoplePerBooking: number;
    meetingRoomActionResult?: IMeetingRoomActionResult;
    meetingRoomBookings: IMeetingRoomBooking[];
    meetingRooms: IMeetingRoom[];
    onActionRequest: (request: IBookingActionRequest) => void;
    onMeetingRoomActionRequest: (request: IMeetingRoomActionRequest) => void;
    onSignOut: () => void;
    previewMode: boolean;
    seats: ISeat[];
}

interface IAppState {
    isSignedIn: boolean;
    bookingSelection?: IBookingSelection;
    confirmedAssignments?: ISeatAssignment[];
    previewActionResult?: IBookingActionResult;
    previewMeetingRoomActionResult?: IMeetingRoomActionResult;
    authorizationError?: string;
    screen: "home" | "bookSeat" | "seatSelection" | "confirmation" | "cancelBooking" | "myBookings" | "meetingRoom";
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

    private readonly handleSignOut = (): void => {
        this.setState(
            {
                isSignedIn: false,
                bookingSelection: undefined,
                confirmedAssignments: undefined,
                previewActionResult: undefined,
                previewMeetingRoomActionResult: undefined,
                screen: "home"
            },
            this.props.onSignOut
        );
    };

    private readonly handleBookSeat = (): void => {
        this.setState({
            bookingSelection: undefined,
            confirmedAssignments: undefined,
            previewActionResult: undefined,
            screen: "bookSeat"
        });
    };

    private readonly handleBookMeetingRoom = (): void => {
        if (!this.props.canBookMeetingRooms) {
            this.setState({
                authorizationError: "You are not authorized to book meeting rooms."
            });
            return;
        }

        this.setState({
            authorizationError: undefined,
            previewMeetingRoomActionResult: undefined,
            screen: "meetingRoom"
        });
    };

    private readonly handleMyBookings = (): void => {
        this.setState({ screen: "myBookings" });
    };

    private readonly handleCancelBooking = (): void => {
        this.setState({ screen: "cancelBooking" });
    };

    private readonly handleBackToHome = (): void => {
        this.setState({
            bookingSelection: undefined,
            confirmedAssignments: undefined,
            previewActionResult: undefined,
            previewMeetingRoomActionResult: undefined,
            screen: "home"
        });
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
            previewActionResult: undefined,
            screen: "bookSeat"
        });
    };

    private readonly handleViewBookings = (): void => {
        this.setState({ screen: "myBookings" });
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

    private readonly handleMeetingRoomActionRequest = (
        request: IMeetingRoomActionRequest
    ): void => {
        if (!this.props.previewMode) {
            this.props.onMeetingRoomActionRequest(request);
            return;
        }

        window.setTimeout(() => {
            this.setState({
                previewMeetingRoomActionResult: {
                    action: "bookMeetingRoom",
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
            bookingAccess,
            bookings,
            myBookings,
            myBookingsPageSize,
            canBookForAnyone,
            canBookMeetingRooms,
            canCreateBookings,
            cancelBookingVisibleRecordCount,
            currentUserEmail,
            currentUserEmployeeCode,
            employees,
            exceptions,
            maximumPeoplePerBooking,
            meetingRoomBookings,
            meetingRooms,
            previewMode,
            seats
        } = this.props;
        const currentEmail = currentUserEmail.trim().toLowerCase();
        const currentEmployeeCode = currentUserEmployeeCode.trim().toLowerCase();
        const signedInEmployee = employees.find(
            (employee) => employee.employeeId.trim().toLowerCase() === currentEmployeeCode
        );
        const displayName = [
            signedInEmployee?.name.trim(),
            currentUserEmail.split("@")[0],
            "User"
        ].find((value) => Boolean(value)) ?? "User";
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

            if (this.state.screen === "meetingRoom") {
                return (
                    <MeetingRoomBookingScreen
                        actionResult={
                            previewMode
                                ? this.state.previewMeetingRoomActionResult
                                : this.props.meetingRoomActionResult
                        }
                        allocatedHeight={allocatedHeight}
                        allocatedWidth={allocatedWidth}
                        bookings={meetingRoomBookings}
                        employees={employees}
                        onActionRequest={this.handleMeetingRoomActionRequest}
                        onBack={this.handleBackToHome}
                        previewMode={previewMode}
                        rooms={meetingRooms}
                    />
                );
            }


            if (this.state.screen === "myBookings") {
                return (
                    <MyBookingsScreen
                        allocatedHeight={allocatedHeight}
                        allocatedWidth={allocatedWidth}
                        bookingAccess={bookingAccess}
                        bookings={myBookings}
                        canBookMeetingRooms={canBookMeetingRooms}
                        currentUserEmail={currentUserEmail}
                        currentUserEmployeeCode={currentUserEmployeeCode}
                        employees={employees}
                        meetingRoomBookings={meetingRoomBookings}
                        meetingRooms={meetingRooms}
                        myBookingsPageSize={myBookingsPageSize}
                        onBack={this.handleBackToHome}
                    />
                );
            }
            if (this.state.screen === "cancelBooking" ) {
                return <CancelBookingScreen actionResult={previewMode ? this.state.previewActionResult : this.props.actionResult} allocatedHeight={allocatedHeight} allocatedWidth={allocatedWidth} bookings={bookings} currentUserEmail={currentUserEmail} currentUserEmployeeCode={currentUserEmployeeCode} employees={employees} visibleRecordCount={cancelBookingVisibleRecordCount} onActionRequest={this.handleActionRequest} onBack={this.handleBackToHome} />;
            }

            return (
                <React.Fragment>
                    <HomeScreen
                        allocatedHeight={allocatedHeight}
                        allocatedWidth={allocatedWidth}
                        bookings={bookings}
                        canCreateBookings={canCreateBookings}
                        displayName={displayName}
                        exceptions={exceptions}
                        meetingRoomBookings={meetingRoomBookings}
                        meetingRooms={meetingRooms}
                        onBookMeetingRoom={this.handleBookMeetingRoom}
                        onCancelBooking={this.handleCancelBooking}
                        onMyBookings={this.handleMyBookings}
                        onBookSeat={this.handleBookSeat}
                        onSignOut={this.handleSignOut}
                        seats={seats}
                    />
                    <ErrorDialog
                        message={this.state.authorizationError}
                        onDismiss={() =>
                            this.setState({ authorizationError: undefined })
                        }
                    />
                </React.Fragment>
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
