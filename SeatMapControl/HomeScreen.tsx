import * as React from "react";

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
import ProfileIcon from "./assets/home/profile.svg";

type SvgIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

export interface IHomeScreenProps {
    allocatedHeight: number;
    allocatedWidth: number;
    canCreateBookings: boolean;
    onBookSeat: () => void;
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

export const NavigationItem: React.FC<INavigationItemProps> = ({
    active,
    disabled,
    icon: Icon,
    label,
    onClick
}) => (
    <button
        className={`dashboard-nav-item${active ? " dashboard-nav-item--active" : ""}`}
        type="button"
        aria-current={active ? "page" : undefined}
        disabled={disabled}
        onClick={onClick}
    >
        {Icon ? <Icon aria-hidden="true" focusable="false" /> : null}
        <span>{label}</span>
    </button>
);

export const Sidebar: React.FC<{
    canCreateBookings: boolean;
    onBookSeat: () => void;
}> = ({ canCreateBookings, onBookSeat }) => (
    <aside className="dashboard-sidebar" aria-label="Primary navigation">
        <AvanadeLogo
            className="dashboard-brand"
            role="img"
            aria-label="Avanade"
            preserveAspectRatio="xMidYMid meet"
        />
        <nav className="dashboard-navigation">
            <NavigationItem active icon={HomeIcon} label="Home" />
            <NavigationItem
                disabled={!canCreateBookings}
                icon={BookSeatIcon}
                label="Book Seat"
                onClick={onBookSeat}
            />
            <NavigationItem icon={BookRoomIcon} label="Book Room" />
            <NavigationItem icon={BookingsIcon} label="My Bookings" />
            <NavigationItem icon={CancelIcon} label="Cancel Booking" />
            <NavigationItem icon={ProfileIcon} label="Profile" />
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

export const MeetingCard: React.FC = () => (
    <article className="meeting-card">
        <span className="meeting-icon">
            <MeetingIcon aria-hidden="true" focusable="false" />
        </span>
        <div>
            <h3>Project Review Meeting</h3>
            <p>Conf Room 1 <span aria-hidden="true">•</span> 10:00 AM – 11:00 AM</p>
        </div>
    </article>
);

export class HomeScreen extends React.PureComponent<IHomeScreenProps> {
    public render(): React.ReactNode {
        const {
            allocatedHeight,
            allocatedWidth,
            canCreateBookings,
            onBookSeat
        } = this.props;
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
            allocatedHeight > 0 ? { height: `${allocatedHeight}px` } : undefined;

        return (
            <div className={classes.join(" ")} style={controlStyle}>
                <Sidebar
                    canCreateBookings={canCreateBookings}
                    onBookSeat={onBookSeat}
                />
                <main className="dashboard-main">
                    <header className="dashboard-header">
                        <div>
                            <h1>Welcome, John Doe</h1>
                            <p>Here&apos;s what&apos;s happening today.</p>
                        </div>
                        <div className="seat-capacity">
                            <span>Total Seat Capacity</span>
                            <strong>76</strong>
                        </div>
                    </header>

                    <section className="status-grid" aria-label="Today at a glance">
                        <StatusCard label="Seat Availability" value="56" />
                        <StatusCard label="Meetings Rooms" value="1" />
                        <StatusCard label="Booked Seats" value="10" />
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
                            <QuickAction icon={ActionRoomIcon} label="Book Meeting Room" />
                            <QuickAction icon={ActionBookingsIcon} label="My Bookings" />
                            <QuickAction icon={CancelIcon} label="Cancel Booking" />
                        </div>
                    </section>

                    <section className="dashboard-section">
                        <div className="section-heading">
                            <h2>Upcoming Meetings</h2>
                            <button type="button">View All</button>
                        </div>
                        <MeetingCard />
                    </section>
                </main>
            </div>
        );
    }
}
