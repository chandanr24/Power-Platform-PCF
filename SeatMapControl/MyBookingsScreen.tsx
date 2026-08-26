import * as React from "react";

import {
    IBookingAccess,
    IEmployee,
    ISeatBooking,
    normalizeEmail
} from "./BookingModels";

export interface IMyBookingsScreenProps {
    allocatedHeight: number;
    allocatedWidth: number;
    bookingAccess: IBookingAccess[];
    bookings: ISeatBooking[];
    currentUserEmail: string;
    employees: IEmployee[];
    myBookingsPageSize?: number;
    onBack: () => void;
}

type AccessLevel = "employee" | "manager" | "practiceLead" | "hr";

const isPracticeLeadRole = (role: string): boolean =>
    role.trim().toLowerCase() === "practice lead";

const isHrRole = (role: string): boolean => role.trim().toLowerCase() === "hr";

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

export const MyBookingsScreen: React.FC<IMyBookingsScreenProps> = ({
    allocatedHeight,
    allocatedWidth,
    bookingAccess,
    bookings,
    currentUserEmail,
    employees,
    myBookingsPageSize,
    onBack
}) => {
    const [dateFrom, setDateFrom] = React.useState("");
    const [dateTo, setDateTo] = React.useState("");
    const [employeeSearch, setEmployeeSearch] = React.useState("");
    const [managerEmail, setManagerEmail] = React.useState("");
    const [page, setPage] = React.useState(1);
    const [teamId, setTeamId] = React.useState("");
    const currentEmail = normalizeEmail(currentUserEmail);
    const employeeById = React.useMemo(() => {
        const values = new Map<string, IEmployee>();
        employees.forEach((employee) => values.set(employee.employeeId.trim().toLowerCase(), employee));
        return values;
    }, [employees]);
    const managerNames = React.useMemo(() => {
        const values = new Map<string, string>();
        employees.forEach((employee) => {
            if (employee.email) {
                values.set(normalizeEmail(employee.email), employee.name);
            }
        });
        return values;
    }, [employees]);
    const accessForCurrentUser = React.useMemo(
        () => bookingAccess.filter((access) => normalizeEmail(access.userEmail) === currentEmail),
        [bookingAccess, currentEmail]
    );
    const hasHrAccess = accessForCurrentUser.some((access) => isHrRole(access.role));
    const practiceTeamIds = React.useMemo(
        () => new Set(accessForCurrentUser.filter((access) => isPracticeLeadRole(access.role)).map((access) => access.teamId.trim().toLowerCase()).filter(Boolean)),
        [accessForCurrentUser]
    );
    const isManager = employees.some((employee) => normalizeEmail(employee.managerEmail) === currentEmail);
    const accessLevel: AccessLevel = hasHrAccess ? "hr" : practiceTeamIds.size > 0 ? "practiceLead" : isManager ? "manager" : "employee";
    const authorizedBookings = React.useMemo(() => bookings.filter((booking) => {
        if (accessLevel === "hr") {
            return true;
        }
        if (accessLevel === "practiceLead") {
            return practiceTeamIds.has(booking.teamId.trim().toLowerCase());
        }
        if (accessLevel === "manager") {
            return normalizeEmail(booking.managerEmail) === currentEmail;
        }
        return normalizeEmail(booking.employeeEmail) === currentEmail;
    }), [accessLevel, bookings, currentEmail, practiceTeamIds]);
    const canFilterTeams = accessLevel === "hr" || accessLevel === "practiceLead";
    const teams = React.useMemo(() => {
        const values = new Map<string, string>();
        authorizedBookings.forEach((booking) => {
            if (booking.teamId) {
                values.set(booking.teamId, booking.teamName || booking.teamId);
            }
        });
        return Array.from(values.entries()).sort((first, second) => first[1].localeCompare(second[1]));
    }, [authorizedBookings]);
    const managers = React.useMemo(() => {
        const values = new Set<string>();
        authorizedBookings.forEach((booking) => {
            if (booking.managerEmail) {
                values.add(normalizeEmail(booking.managerEmail));
            }
        });
        return Array.from(values).sort();
    }, [authorizedBookings]);
    const filteredBookings = React.useMemo(() => {
        const search = employeeSearch.trim().toLowerCase();
        return authorizedBookings.filter((booking) => {
            const employee = employeeById.get(booking.employeeId.trim().toLowerCase());
            const employeeName = booking.employeeName.trim() ? booking.employeeName : employee?.name ?? "";
            return (!dateFrom || booking.bookingDate >= dateFrom) &&
                (!dateTo || booking.bookingDate <= dateTo) &&
                (!search || booking.employeeId.toLowerCase().includes(search) || employeeName.toLowerCase().includes(search)) &&
                (!teamId || booking.teamId === teamId) &&
                (!managerEmail || normalizeEmail(booking.managerEmail) === managerEmail);
        }).sort((first, second) => second.bookingDate.localeCompare(first.bookingDate));
    }, [authorizedBookings, dateFrom, dateTo, employeeById, employeeSearch, managerEmail, teamId]);
    const configuredPageSize = typeof myBookingsPageSize === "number" && Number.isFinite(myBookingsPageSize) && myBookingsPageSize > 0 ? Math.trunc(myBookingsPageSize) : 0;
    const pageCount = configuredPageSize ? Math.max(1, Math.ceil(filteredBookings.length / configuredPageSize)) : 1;
    const activePage = Math.min(page, pageCount);
    const pageBookings = configuredPageSize ? filteredBookings.slice((activePage - 1) * configuredPageSize, activePage * configuredPageSize) : filteredBookings;
    const resetPage = (): void => setPage(1);
    const classes = ["my-bookings-control"];
    if (allocatedWidth > 0 && allocatedWidth <= 650) { classes.push("my-bookings-control--mobile"); }
    const style = allocatedHeight > 0 ? { height: `${allocatedHeight}px` } : undefined;
    const firstRecord = filteredBookings.length ? (configuredPageSize ? (activePage - 1) * configuredPageSize + 1 : 1) : 0;
    const lastRecord = configuredPageSize ? Math.min(activePage * configuredPageSize, filteredBookings.length) : filteredBookings.length;

    return <div className={classes.join(" ")} style={style}>
        <main className="my-bookings-card">
            <header className="my-bookings-header"><button type="button" aria-label="Back to home" onClick={onBack}>←</button><div><h1>My Bookings</h1><p>{accessLevel === "hr" ? "All booking history" : accessLevel === "practiceLead" ? "Booking history for your assigned teams" : accessLevel === "manager" ? "Booking history for your direct reporters" : "Your booking history"}</p></div></header>
            <section className="my-bookings-filters" aria-label="Booking filters">
                <label>From date<input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); resetPage(); }} /></label>
                <label>To date<input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => { setDateTo(event.target.value); resetPage(); }} /></label>
                <label>Employee code or name<input type="search" placeholder="Search employee" value={employeeSearch} onChange={(event) => { setEmployeeSearch(event.target.value); resetPage(); }} /></label>
                {canFilterTeams ? <label>Team<select value={teamId} onChange={(event) => { setTeamId(event.target.value); resetPage(); }}><option value="">All teams</option>{teams.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label> : null}
                {canFilterTeams ? <label>Manager<select value={managerEmail} onChange={(event) => { setManagerEmail(event.target.value); resetPage(); }}><option value="">All managers</option>{managers.map((email) => <option key={email} value={email}>{managerNames.get(email) ?? email}</option>)}</select></label> : null}
            </section>
            <section className="my-bookings-results" aria-label="Booking history">
                <div className="my-bookings-results-heading"><h2>Booking history</h2><span>{filteredBookings.length} record{filteredBookings.length === 1 ? "" : "s"}</span></div>
                {pageBookings.length ? <div className="my-bookings-table-wrap"><table><thead><tr><th>Date</th><th>Employee</th><th>Seat</th><th>Floor / Zone</th><th>Status</th></tr></thead><tbody>{pageBookings.map((booking) => { const employee = employeeById.get(booking.employeeId.trim().toLowerCase()); const name = booking.employeeName.trim() ? booking.employeeName : employee?.name ?? "—"; return <tr key={booking.bookingId || booking.bookingKey}><td>{formatDate(booking.bookingDate)}</td><td><strong>{name}</strong><span>{booking.employeeId}</span></td><td>{booking.seatNumber}</td><td>{booking.floor} / {booking.zone}</td><td><span className={`my-bookings-status my-bookings-status--${booking.status.trim().toLowerCase()}`}>{booking.status}</span></td></tr>; })}</tbody></table></div> : <div className="my-bookings-empty"><strong>No bookings found</strong><p>Try changing the filters or date range.</p></div>}
            </section>
            {configuredPageSize && filteredBookings.length ? <footer className="my-bookings-pager"><span>Showing {firstRecord}–{lastRecord} of {filteredBookings.length}</span><div><button type="button" disabled={activePage === 1} onClick={() => setPage(activePage - 1)}>Previous</button><span>Page {activePage} of {pageCount}</span><button type="button" disabled={activePage === pageCount} onClick={() => setPage(activePage + 1)}>Next</button></div></footer> : null}
        </main>
    </div>;
};
