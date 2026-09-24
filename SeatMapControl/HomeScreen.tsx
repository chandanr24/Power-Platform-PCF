import * as React from "react";

import {
    IMeetingRoom,
    IMeetingRoomBooking,
    ISeat,
    ISeatBooking,
    ISeatException,
    isActiveBooking,
    isSeatExceptionActive,
    normalizeDateValue
} from "./BookingModels";
import { CancelIcon } from "./CancelIcon";
import ActionBookingsIcon from "./assets/home/action-bookings.svg";
import ActionRoomIcon from "./assets/home/action-room.svg";
import ActionSeatIcon from "./assets/home/action-seat.svg";
import AvanadeLogo from "./assets/home/avanade-sidebar.svg";
import BookRoomIcon from "./assets/home/book-room.svg";
import BookSeatIcon from "./assets/home/book-seat.svg";
import BookingsIcon from "./assets/home/bookings.svg";
import HomeIcon from "./assets/home/home.svg";
import MeetingIcon from "./assets/home/meeting.svg";
import SignOutIcon from "./assets/home/sign-out.svg";

type SvgIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

export interface IHomeScreenProps {
    allocatedHeight: number;
    allocatedWidth: number;
    bookings: ISeatBooking[];
    canCreateBookings: boolean;
    displayName: string;
    exceptions: ISeatException[];
    meetingRoomBookings: IMeetingRoomBooking[];
    meetingRooms: IMeetingRoom[];
    onBookMeetingRoom: () => void;
    onCancelBooking: () => void;
    onMyBookings: () => void;
    onBookSeat: () => void;
    onSignOut: () => void;
    seats: ISeat[];
}

interface INavigationItemProps {
    active?: boolean;
    disabled?: boolean;
    icon?: SvgIcon;
    label: string;
    onClick?: () => void;
}

interface IStatusCardProps {
    label: string;
    value: string;
}

interface IQuickActionProps {
    disabled?: boolean;
    icon?: SvgIcon;
    label: string;
    onClick?: () => void;
}

interface IMeetingCardProps {
    booking: IMeetingRoomBooking;
    inProgress: boolean;
    roomName: string;
}

const formatTime = (value: string): string => {
    const [rawHour, minute] = value.split(":");
    const hour = Number(rawHour);

    if (!Number.isInteger(hour) || !minute) {
        return value;
    }

    return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
};

export const NavigationItem: React.FC<INavigationItemProps> = ({
    active,
    disabled,
    icon: Icon,
    label,
    onClick
}) => (
    <button
        aria-current={active ? "page" : undefined}
        className={`dashboard-nav-item${active ? " dashboard-nav-item--active" : ""}`}
        disabled={disabled}
        type="button"
        onClick={onClick}
    >
        {Icon ? <Icon aria-hidden="true" focusable="false" /> : null}
        <span>{label}</span>
    </button>
);

export const Sidebar: React.FC<{
    canCreateBookings: boolean;
    onBookMeetingRoom: () => void;
    onCancelBooking: () => void;
    onMyBookings: () => void;
    onBookSeat: () => void;
    onSignOut: () => void;
}> = ({
    canCreateBookings,
    onBookMeetingRoom,
    onCancelBooking,
    onMyBookings,
    onBookSeat,
    onSignOut
}) => (
    <aside className="dashboard-sidebar" aria-label="Primary navigation">
        <AvanadeLogo
            aria-label="Avanade"
            className="dashboard-brand"
            preserveAspectRatio="xMidYMid meet"
            role="img"
        />
        <nav className="dashboard-navigation">
            <NavigationItem active icon={HomeIcon} label="Home" />
            <NavigationItem
                disabled={!canCreateBookings}
                icon={BookSeatIcon}
                label="Book Seat"
                onClick={onBookSeat}
            />
            <NavigationItem
                icon={BookRoomIcon}
                label="Book Room"
                onClick={onBookMeetingRoom}
            />
            <NavigationItem
                icon={BookingsIcon}
                label="My Bookings"
                onClick={onMyBookings}
            />
            <NavigationItem
                icon={CancelIcon}
                label="Cancel Booking"
                onClick={onCancelBooking}
            />
            <NavigationItem
                icon={SignOutIcon}
                label="Sign out"
                onClick={onSignOut}
            />
        </nav>
    </aside>
);

export const StatusCard: React.FC<IStatusCardProps> = ({ label, value }) => (
    <article className="status-card">
        <h3>{label}</h3>
        <strong>{value}</strong>
    </article>
);

export const QuickAction: React.FC<IQuickActionProps> = ({
    disabled,
    icon: Icon,
    label,
    onClick
}) => (
    <button
        className="quick-action"
        disabled={disabled}
        type="button"
        onClick={onClick}
    >
        {Icon ? <Icon aria-hidden="true" focusable="false" /> : null}
        <span>{label}</span>
    </button>
);

export const MeetingCard: React.FC<IMeetingCardProps> = ({
    booking,
    inProgress,
    roomName
}) => (
    <article className="meeting-card">
        <span className="meeting-icon">
            <MeetingIcon aria-hidden="true" focusable="false" />
        </span>
        <div className="meeting-card-details">
            <h3>{roomName}</h3>
            <p>
                {booking.practice || "Team not specified"}
                <span aria-hidden="true">•</span>
                {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
            </p>
        </div>
        <span
            className={
                inProgress
                    ? "meeting-state meeting-state--active"
                    : "meeting-state"
            }
        >
            {inProgress ? "In use now" : "Upcoming"}
        </span>
    </article>
);

export class HomeScreen extends React.PureComponent<IHomeScreenProps> {
    public render(): React.ReactNode {
        const {
            allocatedHeight,
            allocatedWidth,
            bookings,
            canCreateBookings,
            displayName,
            exceptions,
            meetingRoomBookings,
            meetingRooms,
            onBookMeetingRoom,
            onCancelBooking,
            onMyBookings,
            onBookSeat,
            onSignOut,
            seats
        } = this.props;
        const today = normalizeDateValue(new Date());
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
            now.getMinutes()
        ).padStart(2, "0")}`;
        const seatKeys = new Set(
            seats.map((seat) => seat.seatKey.trim().toLowerCase())
        );
        const activeTodayBookings = bookings.filter((booking) => {
            const status = booking.status.trim().toLowerCase();

            return (
                booking.bookingDate === today &&
                (status === "booked" || status === "selected") &&
                isActiveBooking(booking) &&
                seatKeys.has(booking.seatKey.trim().toLowerCase())
            );
        });
        const occupiedSeatKeys = new Set(
            activeTodayBookings.map((booking) =>
                booking.seatKey.trim().toLowerCase()
            )
        );
        const bookedSeatKeys = new Set(
            activeTodayBookings
                .filter(
                    (booking) =>
                        booking.status.trim().toLowerCase() === "booked"
                )
                .map((booking) => booking.seatKey.trim().toLowerCase())
        );
        const blockedSeatKeys = new Set(
            exceptions
                .filter((exception) =>
                    isSeatExceptionActive(exception, today)
                )
                .map((exception) => exception.seatKey.trim().toLowerCase())
        );
        const unavailableSeatKeys = new Set([
            ...occupiedSeatKeys,
            ...blockedSeatKeys
        ]);
        const availableSeatCount = seats.filter(
            (seat) =>
                !unavailableSeatKeys.has(seat.seatKey.trim().toLowerCase())
        ).length;
        const activeRooms = meetingRooms.filter(
            (room) => room.status.trim().toLowerCase() === "active"
        );
        const roomByKey = new Map(
            activeRooms.map((room) => [
                room.roomKey.trim().toLowerCase(),
                room
            ])
        );
        const todayMeetings = meetingRoomBookings
            .filter(
                (booking) =>
                    booking.bookingDate === today &&
                    booking.status.trim().toLowerCase() === "booked" &&
                    booking.endTime > currentTime &&
                    roomByKey.has(booking.roomKey.trim().toLowerCase())
            )
            .sort((left, right) =>
                left.startTime.localeCompare(right.startTime)
            );
        const occupiedRoomKeys = new Set(
            todayMeetings
                .filter(
                    (booking) =>
                        booking.startTime <= currentTime &&
                        booking.endTime > currentTime
                )
                .map((booking) => booking.roomKey.trim().toLowerCase())
        );
        const classes = ["dashboard-control"];

        if (allocatedWidth > 0 && allocatedWidth <= 600) {
            classes.push("dashboard-control--mobile");
        } else if (allocatedWidth > 0 && allocatedWidth <= 900) {
            classes.push("dashboard-control--tablet");
        } else if (allocatedWidth > 0 && allocatedWidth <= 1180) {
            classes.push("dashboard-control--compact");
        }

        if (allocatedHeight > 0 && allocatedHeight <= 640) {
            classes.push("dashboard-control--short");
        }

        const controlStyle: React.CSSProperties | undefined =
            allocatedHeight > 0
                ? { height: `${allocatedHeight}px` }
                : undefined;

        return (
            <div className={classes.join(" ")} style={controlStyle}>
                <Sidebar
                    canCreateBookings={canCreateBookings}
                    onBookMeetingRoom={onBookMeetingRoom}
                    onCancelBooking={onCancelBooking}
                    onMyBookings={onMyBookings}
                    onBookSeat={onBookSeat}
                    onSignOut={onSignOut}
                />
                <main className="dashboard-main">
                    <header className="dashboard-header">
                        <div>
                            <h1>Welcome, {displayName}</h1>
                            <p>Here&apos;s what&apos;s happening today.</p>
                        </div>
                        <div className="seat-capacity">
                            <span>Total Seat Capacity</span>
                            <strong>{seats.length}</strong>
                        </div>
                    </header>

                    <section
                        aria-label="Today at a glance"
                        className="status-grid"
                    >
                        <StatusCard
                            label="Seat Availability"
                            value={String(availableSeatCount)}
                        />
                        <StatusCard
                            label="Available Meeting Rooms"
                            value={String(
                                activeRooms.length - occupiedRoomKeys.size
                            )}
                        />
                        <StatusCard
                            label="Occupied Meeting Rooms"
                            value={String(occupiedRoomKeys.size)}
                        />
                        <StatusCard
                            label="Booked Seats"
                            value={String(bookedSeatKeys.size)}
                        />
                    </section>

                    <section className="dashboard-section">
                        <h2>Quick Actions</h2>
                        <div className="quick-actions">
                            <QuickAction
                                disabled={!canCreateBookings}
                                icon={ActionSeatIcon}
                                label="Book Seat"
                                onClick={onBookSeat}
                            />
                            <QuickAction
                                icon={ActionRoomIcon}
                                label="Book Meeting Room"
                                onClick={onBookMeetingRoom}
                            />
                            <QuickAction
                                icon={ActionBookingsIcon}
                                label="My Bookings"
                                onClick={onMyBookings}
                            />
                            <QuickAction
                                icon={CancelIcon}
                                label="Cancel Booking"
                                onClick={onCancelBooking}
                            />
                        </div>
                    </section>

                    <section className="dashboard-section">
                        <div className="section-heading">
                            <h2>Upcoming Meetings</h2>
                            <span>{todayMeetings.length} remaining today</span>
                        </div>
                        {todayMeetings.length ? (
                            <div className="meeting-list">
                                {todayMeetings.map((booking) => {
                                    const room = roomByKey.get(
                                        booking.roomKey.trim().toLowerCase()
                                    );

                                    return (
                                        <MeetingCard
                                            booking={booking}
                                            inProgress={
                                                booking.startTime <= currentTime
                                            }
                                            key={
                                                booking.bookingId ||
                                                `${booking.roomKey}|${booking.startTime}`
                                            }
                                            roomName={
                                                room?.roomName ??
                                                booking.roomKey
                                            }
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="meeting-empty">
                                No meetings are in progress or scheduled later
                                today.
                            </div>
                        )}
                    </section>
                </main>
            </div>
        );
    }
}
