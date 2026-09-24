import * as React from "react";

import {
    IBookingAccess,
    IMeetingRoom,
    IMeetingRoomBooking,
    normalizeEmail
} from "./BookingModels";
import { WorkingDayCalendar } from "./WorkingDayCalendar";

interface IBookingTypeToggleProps {
    activeView: "seat" | "room";
    onShowRoomBookings: () => void;
    onShowSeatBookings: () => void;
}

export const BookingTypeToggle: React.FC<IBookingTypeToggleProps> = ({
    activeView,
    onShowRoomBookings,
    onShowSeatBookings
}) => (
    <div aria-label="Booking type" className="my-bookings-toggle" role="tablist">
        <button
            aria-selected={activeView === "seat"}
            className={
                activeView === "seat"
                    ? "my-bookings-toggle--active"
                    : undefined
            }
            role="tab"
            type="button"
            onClick={onShowSeatBookings}
        >
            Seat Bookings
        </button>
        <button
            aria-selected={activeView === "room"}
            className={
                activeView === "room"
                    ? "my-bookings-toggle--active"
                    : undefined
            }
            role="tab"
            type="button"
            onClick={onShowRoomBookings}
        >
            Room Bookings
        </button>
    </div>
);

interface IRoomBookingsHistoryProps {
    allocatedHeight: number;
    allocatedWidth: number;
    bookingAccess: IBookingAccess[];
    currentUserEmail: string;
    meetingRoomBookings: IMeetingRoomBooking[];
    meetingRooms: IMeetingRoom[];
    onBack: () => void;
    onShowSeatBookings: () => void;
}

const formatDate = (value: string): string => {
    const date = new Date(`${value}T00:00:00`);

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString(undefined, {
              day: "2-digit",
              month: "short",
              year: "numeric"
          });
};

const formatTime = (value: string): string => {
    const [rawHour, minute] = value.split(":");
    const hour = Number(rawHour);

    return Number.isInteger(hour) && minute
        ? `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`
        : value;
};

export const RoomBookingsHistory: React.FC<IRoomBookingsHistoryProps> = ({
    allocatedHeight,
    allocatedWidth,
    bookingAccess,
    currentUserEmail,
    meetingRoomBookings,
    meetingRooms,
    onBack,
    onShowSeatBookings
}) => {
    const [dateFrom, setDateFrom] = React.useState("");
    const [dateTo, setDateTo] = React.useState("");
    const [roomSearch, setRoomSearch] = React.useState("");
    const [status, setStatus] = React.useState("");
    const [team, setTeam] = React.useState("");
    const currentEmail = normalizeEmail(currentUserEmail);
    const userAccess = React.useMemo(
        () =>
            bookingAccess.filter(
                (access) => normalizeEmail(access.userEmail) === currentEmail
            ),
        [bookingAccess, currentEmail]
    );
    const hasHrAccess = userAccess.some(
        (access) => access.role.trim().toLowerCase() === "hr"
    );
    const practiceTeams = React.useMemo(
        () =>
            new Set(
                userAccess
                    .filter(
                        (access) =>
                            access.role.trim().toLowerCase() ===
                            "practice lead"
                    )
                    .map((access) => access.teamId.trim().toLowerCase())
                    .filter(Boolean)
            ),
        [userAccess]
    );
    const roomByKey = React.useMemo(
        () =>
            new Map(
                meetingRooms.map((room) => [
                    room.roomKey.trim().toLowerCase(),
                    room
                ])
            ),
        [meetingRooms]
    );
    const authorizedBookings = React.useMemo(
        () =>
            meetingRoomBookings.filter((booking) => {
                if (hasHrAccess) {
                    return true;
                }
                if (practiceTeams.size) {
                    return practiceTeams.has(
                        booking.practice.trim().toLowerCase()
                    );
                }
                return (
                    Boolean(currentEmail) &&
                    normalizeEmail(booking.bookedByEmail) === currentEmail
                );
            }),
        [
            currentEmail,
            hasHrAccess,
            meetingRoomBookings,
            practiceTeams
        ]
    );
    const teams = React.useMemo(
        () =>
            Array.from(
                new Set(
                    authorizedBookings
                        .map((booking) => booking.practice)
                        .filter(Boolean)
                )
            ).sort((left, right) => left.localeCompare(right)),
        [authorizedBookings]
    );
    const statuses = React.useMemo(
        () =>
            Array.from(
                new Set(
                    authorizedBookings
                        .map((booking) => booking.status)
                        .filter(Boolean)
                )
            ).sort((left, right) => left.localeCompare(right)),
        [authorizedBookings]
    );
    const filteredBookings = React.useMemo(() => {
        const search = roomSearch.trim().toLowerCase();

        return authorizedBookings
            .filter((booking) => {
                const room = roomByKey.get(
                    booking.roomKey.trim().toLowerCase()
                );

                return (
                    (!dateFrom || booking.bookingDate >= dateFrom) &&
                    (!dateTo || booking.bookingDate <= dateTo) &&
                    (!search ||
                        booking.roomKey.toLowerCase().includes(search) ||
                        Boolean(
                            room?.roomName.toLowerCase().includes(search)
                        )) &&
                    (!team || booking.practice === team) &&
                    (!status || booking.status === status)
                );
            })
            .sort(
                (left, right) =>
                    right.bookingDate.localeCompare(left.bookingDate) ||
                    right.startTime.localeCompare(left.startTime)
            );
    }, [
        authorizedBookings,
        dateFrom,
        dateTo,
        roomByKey,
        roomSearch,
        status,
        team
    ]);
    const classes = ["my-bookings-control"];

    if (allocatedWidth > 0 && allocatedWidth <= 650) {
        classes.push("my-bookings-control--mobile");
    }

    const style =
        allocatedHeight > 0 ? { height: `${allocatedHeight}px` } : undefined;

    return (
        <div className={classes.join(" ")} style={style}>
            <main className="my-bookings-card">
                <header className="my-bookings-header">
                    <button
                        aria-label="Back to home"
                        type="button"
                        onClick={onBack}
                    >
                        ←
                    </button>
                    <div>
                        <h1>My Bookings</h1>
                        <p>Meeting-room booking history</p>
                    </div>
                </header>
                <BookingTypeToggle
                    activeView="room"
                    onShowRoomBookings={() => undefined}
                    onShowSeatBookings={onShowSeatBookings}
                />
                <section
                    aria-label="Room booking filters"
                    className="my-bookings-filters"
                >
                    <label>
                        From date
                        <WorkingDayCalendar
                            id="room-bookings-from-date"
                            maximumDate={dateTo}
                            placeholder="Select from date"
                            value={dateFrom}
                            workingDaysOnly={false}
                            onChange={setDateFrom}
                        />
                    </label>
                    <label>
                        To date
                        <WorkingDayCalendar
                            id="room-bookings-to-date"
                            minimumDate={dateFrom}
                            placeholder="Select to date"
                            value={dateTo}
                            workingDaysOnly={false}
                            onChange={setDateTo}
                        />
                    </label>
                    <label>
                        Meeting room
                        <input
                            placeholder="Search meeting room"
                            type="search"
                            value={roomSearch}
                            onChange={(event) =>
                                setRoomSearch(event.target.value)
                            }
                        />
                    </label>
                    <label>
                        Team
                        <select
                            value={team}
                            onChange={(event) => setTeam(event.target.value)}
                        >
                            <option value="">All teams</option>
                            {teams.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Status
                        <select
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                        >
                            <option value="">All statuses</option>
                            {statuses.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </label>
                </section>
                <section
                    aria-label="Room booking history"
                    className="my-bookings-results"
                >
                    <div className="my-bookings-results-heading">
                        <h2>Room booking history</h2>
                        <span>
                            {filteredBookings.length} record
                            {filteredBookings.length === 1 ? "" : "s"}
                        </span>
                    </div>
                    {filteredBookings.length ? (
                        <div className="my-bookings-table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Meeting Room</th>
                                        <th>Team</th>
                                        <th>Time</th>
                                        <th>Booked By</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBookings.map((booking) => {
                                        const room = roomByKey.get(
                                            booking.roomKey
                                                .trim()
                                                .toLowerCase()
                                        );
                                        const statusClass = booking.status
                                            .trim()
                                            .toLowerCase()
                                            .replace(/[^a-z0-9]+/g, "-");

                                        return (
                                            <tr
                                                key={
                                                    booking.bookingId ||
                                                    `${booking.roomKey}|${booking.bookingDate}|${booking.startTime}`
                                                }
                                            >
                                                <td>
                                                    {formatDate(
                                                        booking.bookingDate
                                                    )}
                                                </td>
                                                <td>
                                                    <strong>
                                                        {room?.roomName ??
                                                            booking.roomKey}
                                                    </strong>
                                                    <span>
                                                        {room
                                                            ? `${room.floor} / ${room.zone}`
                                                            : booking.roomKey}
                                                    </span>
                                                </td>
                                                <td>
                                                    {booking.practice || "—"}
                                                </td>
                                                <td>
                                                    {formatTime(
                                                        booking.startTime
                                                    )}{" "}
                                                    –{" "}
                                                    {formatTime(
                                                        booking.endTime
                                                    )}
                                                </td>
                                                <td>
                                                    {booking.bookedByEmail ||
                                                        "—"}
                                                </td>
                                                <td>
                                                    <span
                                                        className={`my-bookings-status my-bookings-status--${statusClass}`}
                                                    >
                                                        {booking.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="my-bookings-empty">
                            <strong>No room bookings found</strong>
                            <p>Try changing the filters or date range.</p>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};
