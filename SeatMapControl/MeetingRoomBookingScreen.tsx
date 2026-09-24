import * as React from "react";

import { BackButton } from "./BackButton";
import {
    BookingDropdown,
    BookingProgress,
    FormField,
    PrimaryButton
} from "./BookingComponents";
import {
    IEmployee,
    IMeetingRoom,
    IMeetingRoomActionRequest,
    IMeetingRoomActionResult,
    IMeetingRoomBooking
} from "./BookingModels";
import { ErrorDialog } from "./ErrorDialog";
import {
    WorkingDayCalendar,
    getDefaultBookingDate,
    isSelectableBookingDate
} from "./WorkingDayCalendar";

const MEETING_STEPS: readonly [string, string, string] = [
    "Select Date & Filters",
    "Choose Room",
    "Confirm"
];

export interface IMeetingRoomBookingScreenProps {
    actionResult?: IMeetingRoomActionResult;
    allocatedHeight: number;
    allocatedWidth: number;
    bookings: IMeetingRoomBooking[];
    employees: IEmployee[];
    onActionRequest: (request: IMeetingRoomActionRequest) => void;
    onBack: () => void;
    previewMode: boolean;
    rooms: IMeetingRoom[];
}

interface IMeetingRoomBookingScreenState {
    booked: boolean;
    date: string;
    endTime: string;
    errorMessage?: string;
    floor: string;
    pendingRequestId?: string;
    practice: string;
    roomSearch: string;
    selectedRoomKey: string;
    startTime: string;
    step: 1 | 2 | 3;
    zone: string;
}

const createRequestId = (): string =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const isBlockingMeetingStatus = (status: string): boolean => {
    const normalizedStatus = status.trim().toLowerCase();

    return normalizedStatus !== "cancelled" && normalizedStatus !== "rejected";
};

interface IMeetingTimePickerProps {
    id: string;
    onChange: (value: string) => void;
    value: string;
}

interface IMeetingTimeParts {
    hour: string;
    minute: string;
    period: "AM" | "PM";
}

const TIME_HOURS = Array.from({ length: 12 }, (_, index) =>
    String(index + 1).padStart(2, "0")
);
const TIME_MINUTES = Array.from({ length: 60 }, (_, index) =>
    String(index).padStart(2, "0")
);

const getTimeParts = (value: string): IMeetingTimeParts => {
    const now = new Date();
    const [rawHour, rawMinute] = value.split(":").map(Number);
    const hour24 = Number.isInteger(rawHour) ? rawHour : now.getHours();
    const minute = Number.isInteger(rawMinute) ? rawMinute : now.getMinutes();

    return {
        hour: String(hour24 % 12 || 12).padStart(2, "0"),
        minute: String(minute).padStart(2, "0"),
        period: hour24 >= 12 ? "PM" : "AM"
    };
};

const getTimeValue = (parts: IMeetingTimeParts): string => {
    const hour12 = Number(parts.hour);
    const hour24 =
        parts.period === "PM" ? (hour12 % 12) + 12 : hour12 % 12;

    return `${String(hour24).padStart(2, "0")}:${parts.minute}`;
};

const getTimeLabel = (value: string): string => {
    if (!value) {
        return "--:-- --";
    }

    const parts = getTimeParts(value);
    return `${parts.hour}:${parts.minute} ${parts.period}`;
};

const MeetingTimePicker: React.FC<IMeetingTimePickerProps> = ({
    id,
    onChange,
    value
}) => {
    const initialParts = getTimeParts(value);
    const [draft, setDraft] = React.useState<IMeetingTimeParts>(initialParts);
    const [isOpen, setIsOpen] = React.useState(false);
    const pickerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const closeOnOutsideClick = (event: PointerEvent): void => {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("pointerdown", closeOnOutsideClick);
        return () =>
            document.removeEventListener("pointerdown", closeOnOutsideClick);
    }, [isOpen]);

    const openPicker = (): void => {
        setDraft(getTimeParts(value));
        setIsOpen(true);
    };

    return (
        <div className="meeting-time-picker" ref={pickerRef}>
            <button
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                className="meeting-time-trigger"
                id={id}
                type="button"
                onClick={() => (isOpen ? setIsOpen(false) : openPicker())}
            >
                <span className={value ? undefined : "meeting-time-placeholder"}>
                    {getTimeLabel(value)}
                </span>
                <span aria-hidden="true" className="meeting-time-icon" />
            </button>
            {isOpen ? (
                <div
                    aria-label="Select time"
                    className="meeting-time-popover"
                    role="dialog"
                >
                    <div className="meeting-time-column">
                        <span>Hour</span>
                        <div className="meeting-time-options">
                            {TIME_HOURS.map((hour) => (
                                <button
                                    className={
                                        draft.hour === hour
                                            ? "meeting-time-option meeting-time-option--selected"
                                            : "meeting-time-option"
                                    }
                                    key={hour}
                                    type="button"
                                    onClick={() =>
                                        setDraft((current) => ({
                                            ...current,
                                            hour
                                        }))
                                    }
                                >
                                    {hour}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="meeting-time-column">
                        <span>Minute</span>
                        <div className="meeting-time-options">
                            {TIME_MINUTES.map((minute) => (
                                <button
                                    className={
                                        draft.minute === minute
                                            ? "meeting-time-option meeting-time-option--selected"
                                            : "meeting-time-option"
                                    }
                                    key={minute}
                                    type="button"
                                    onClick={() =>
                                        setDraft((current) => ({
                                            ...current,
                                            minute
                                        }))
                                    }
                                >
                                    {minute}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="meeting-time-column meeting-time-period">
                        <span>Period</span>
                        <div className="meeting-time-options">
                            {(["AM", "PM"] as const).map((period) => (
                                <button
                                    className={
                                        draft.period === period
                                            ? "meeting-time-option meeting-time-option--selected"
                                            : "meeting-time-option"
                                    }
                                    key={period}
                                    type="button"
                                    onClick={() =>
                                        setDraft((current) => ({
                                            ...current,
                                            period
                                        }))
                                    }
                                >
                                    {period}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        className="meeting-time-apply"
                        type="button"
                        onClick={() => {
                            onChange(getTimeValue(draft));
                            setIsOpen(false);
                        }}
                    >
                        Apply
                    </button>
                </div>
            ) : null}
        </div>
    );
};

export class MeetingRoomBookingScreen extends React.PureComponent<
    IMeetingRoomBookingScreenProps,
    IMeetingRoomBookingScreenState
> {
    public state: IMeetingRoomBookingScreenState = {
        booked: false,
        date: getDefaultBookingDate(),
        endTime: "",
        floor: "",
        practice: "",
        roomSearch: "",
        selectedRoomKey: "",
        startTime: "",
        step: 1,
        zone: ""
    };

    public componentDidUpdate(
        previousProps: IMeetingRoomBookingScreenProps
    ): void {
        const result = this.props.actionResult;

        if (
            result === previousProps.actionResult ||
            !result ||
            result.requestId !== this.state.pendingRequestId
        ) {
            return;
        }

        if (result.success) {
            this.setState({ booked: true, pendingRequestId: undefined });
        } else {
            this.setState({
                errorMessage:
                    result.error ??
                    "The meeting room could not be booked. Refresh and try another room.",
                pendingRequestId: undefined
            });
        }
    }

    private get activeRooms(): IMeetingRoom[] {
        return this.props.rooms.filter(
            (room) => room.status.trim().toLowerCase() === "active"
        );
    }

    private get practices(): string[] {
        return Array.from(
            new Set(
                this.props.employees
                    .map(
                        (employee) =>
                            employee.teamName.trim() || employee.teamId.trim()
                    )
                    .filter(Boolean)
            )
        ).sort((left, right) => left.localeCompare(right));
    }

    private get availableRooms(): IMeetingRoom[] {
        const search = this.state.roomSearch.trim().toLowerCase();

        return this.activeRooms
            .filter(
                (room) =>
                    room.floor === this.state.floor &&
                    room.zone === this.state.zone &&
                    !this.props.bookings.some(
                        (booking) =>
                            booking.bookingDate === this.state.date &&
                            booking.roomKey.trim().toLowerCase() ===
                                room.roomKey.trim().toLowerCase() &&
                            isBlockingMeetingStatus(booking.status) &&
                            booking.startTime < this.state.endTime &&
                            booking.endTime > this.state.startTime
                    )
            )
            .filter(
                (room) =>
                    !search ||
                    room.roomName.toLowerCase().includes(search) ||
                    room.roomKey.toLowerCase().includes(search)
            )
            .sort((left, right) => left.roomName.localeCompare(right.roomName));
    }

    private readonly handleFiltersSubmit = (
        event: React.FormEvent<HTMLFormElement>
    ): void => {
        event.preventDefault();
        const errors = [
            !this.props.previewMode && !isSelectableBookingDate(this.state.date)
                ? "Select a weekday within the next 60 working days."
                : "",
            this.state.floor ? "" : "Select a floor.",
            this.state.zone ? "" : "Select a zone.",
            this.state.practice ? "" : "Select a team."
        ].filter(Boolean);

        if (errors.length) {
            this.setState({ errorMessage: errors.join("\n") });
            return;
        }

        this.setState({ errorMessage: undefined, step: 2 });
    };

    private readonly handleRoomSubmit = (
        event: React.FormEvent<HTMLFormElement>
    ): void => {
        event.preventDefault();
        const selectedRoom = this.activeRooms.find(
            (room) => room.roomKey === this.state.selectedRoomKey
        );
        const errors = [
            this.state.startTime ? "" : "Select a start time.",
            this.state.endTime ? "" : "Select an end time.",
            this.state.startTime &&
            this.state.endTime &&
            this.state.endTime <= this.state.startTime
                ? "End time must be later than start time."
                : "",
            selectedRoom ? "" : "Select one available meeting room."
        ].filter(Boolean);

        if (errors.length) {
            this.setState({ errorMessage: errors.join("\n") });
            return;
        }

        this.setState({ errorMessage: undefined, step: 3 });
    };

    private readonly handleBook = (): void => {
        const room = this.activeRooms.find(
            (candidate) => candidate.roomKey === this.state.selectedRoomKey
        );

        if (!room || this.state.pendingRequestId) {
            return;
        }

        const requestId = createRequestId();
        const request: IMeetingRoomActionRequest = {
            action: "bookMeetingRoom",
            meeting: {
                bookingDate: this.state.date,
                endTime: this.state.endTime,
                floor: this.state.floor,
                practice: this.state.practice,
                roomCapacity: room.capacity,
                roomKey: room.roomKey,
                roomName: room.roomName,
                startTime: this.state.startTime,
                zone: this.state.zone
            },
            requestId
        };

        this.setState({ errorMessage: undefined, pendingRequestId: requestId });
        this.props.onActionRequest(request);
    };

    public render(): React.ReactNode {
        const { allocatedHeight, allocatedWidth } = this.props;
        const classes = ["meeting-room-control"];
        const floors = Array.from(
            new Set(this.activeRooms.map((room) => room.floor).filter(Boolean))
        ).sort();
        const zones = Array.from(
            new Set(
                this.activeRooms
                    .filter((room) => room.floor === this.state.floor)
                    .map((room) => room.zone)
                    .filter(Boolean)
            )
        ).sort();
        const selectedRoom = this.activeRooms.find(
            (room) => room.roomKey === this.state.selectedRoomKey
        );

        if (allocatedWidth > 0 && allocatedWidth <= 600) {
            classes.push("meeting-room-control--mobile");
        } else if (allocatedWidth > 0 && allocatedWidth <= 900) {
            classes.push("meeting-room-control--tablet");
        }

        if (allocatedHeight > 0 && allocatedHeight <= 640) {
            classes.push("meeting-room-control--short");
        }

        return (
            <main className={classes.join(" ")}>
                <section className="booking-card meeting-room-card" aria-labelledby="meeting-room-title">
                    <header className="booking-header">
                        <div className="booking-title-row">
                            <BackButton
                                label={this.state.step === 1 ? "Back to Home" : "Previous step"}
                                onClick={() => {
                                    if (this.state.step === 1 || this.state.booked) {
                                        this.props.onBack();
                                    } else {
                                        this.setState((state) => ({
                                            errorMessage: undefined,
                                            step: state.step === 3 ? 2 : 1
                                        }));
                                    }
                                }}
                            />
                            <h1 id="meeting-room-title">Book Meeting Room</h1>
                        </div>
                        <BookingProgress activeStep={this.state.step} labels={MEETING_STEPS} />
                    </header>

                    {this.state.step === 1 ? (
                        <form className="booking-form" noValidate onSubmit={this.handleFiltersSubmit}>
                            <FormField htmlFor="meeting-date" label="Select Date">
                                <WorkingDayCalendar
                                    id="meeting-date"
                                    value={this.state.date}
                                    onChange={(date) =>
                                        this.setState({ date, errorMessage: undefined })
                                    }
                                />
                            </FormField>
                            <FormField htmlFor="meeting-floor" label="Select Floor">
                                <BookingDropdown
                                    id="meeting-floor"
                                    onChange={(floor) =>
                                        this.setState({
                                            errorMessage: undefined,
                                            floor,
                                            selectedRoomKey: "",
                                            zone: ""
                                        })
                                    }
                                    options={floors}
                                    placeholder="Select a floor"
                                    value={this.state.floor}
                                />
                            </FormField>
                            <FormField htmlFor="meeting-zone" label="Select Zone">
                                <BookingDropdown
                                    disabled={!this.state.floor}
                                    id="meeting-zone"
                                    onChange={(zone) =>
                                        this.setState({
                                            errorMessage: undefined,
                                            selectedRoomKey: "",
                                            zone
                                        })
                                    }
                                    options={zones}
                                    placeholder="Select a zone"
                                    value={this.state.zone}
                                />
                            </FormField>
                            <FormField htmlFor="meeting-practice" label="Select Team">
                                <BookingDropdown
                                    id="meeting-practice"
                                    onChange={(practice) =>
                                        this.setState({
                                            errorMessage: undefined,
                                            practice
                                        })
                                    }
                                    options={this.practices}
                                    placeholder="Select a team"
                                    value={this.state.practice}
                                />
                            </FormField>
                            <PrimaryButton type="submit">Continue</PrimaryButton>
                        </form>
                    ) : null}

                    {this.state.step === 2 ? (
                        <form className="booking-form" noValidate onSubmit={this.handleRoomSubmit}>
                            <div className="meeting-time-grid">
                                <FormField htmlFor="meeting-start-time" label="Start Time">
                                    <MeetingTimePicker
                                        id="meeting-start-time"
                                        value={this.state.startTime}
                                        onChange={(startTime) =>
                                            this.setState({
                                                errorMessage: undefined,
                                                selectedRoomKey: "",
                                                startTime
                                            })
                                        }
                                    />
                                </FormField>
                                <FormField htmlFor="meeting-end-time" label="End Time">
                                    <MeetingTimePicker
                                        id="meeting-end-time"
                                        value={this.state.endTime}
                                        onChange={(endTime) =>
                                            this.setState({
                                                endTime,
                                                errorMessage: undefined,
                                                selectedRoomKey: ""
                                            })
                                        }
                                    />
                                </FormField>
                            </div>
                            <FormField htmlFor="meeting-room-search" label="Select Meeting Room">
                                <input
                                    id="meeting-room-search"
                                    placeholder="Search meeting room"
                                    type="search"
                                    value={this.state.roomSearch}
                                    onChange={(event) =>
                                        this.setState({ roomSearch: event.target.value })
                                    }
                                    onBlur={() => this.setState({ roomSearch: "" })}
                                />
                            </FormField>
                            <div className="meeting-room-list" role="radiogroup" aria-label="Available meeting rooms">
                                {this.state.startTime && this.state.endTime ? (
                                    this.availableRooms.length ? (
                                        this.availableRooms.map((room) => (
                                            <button
                                                aria-checked={room.roomKey === this.state.selectedRoomKey}
                                                className={
                                                    room.roomKey === this.state.selectedRoomKey
                                                        ? "meeting-room-option meeting-room-option--selected"
                                                        : "meeting-room-option"
                                                }
                                                key={room.roomKey}
                                                role="radio"
                                                type="button"
                                                onClick={() =>
                                                    this.setState({
                                                        errorMessage: undefined,
                                                        selectedRoomKey: room.roomKey
                                                    })
                                                }
                                            >
                                                <span>
                                                    <strong>{room.roomName}</strong>
                                                    <small>{room.floor} / {room.zone}</small>
                                                </span>
                                                <span>Capacity: {room.capacity}</span>
                                            </button>
                                        ))
                                    ) : (
                                        <p className="meeting-room-empty">No rooms are available for this time.</p>
                                    )
                                ) : (
                                    <p className="meeting-room-empty">Select start and end time to view available rooms.</p>
                                )}
                            </div>
                            <PrimaryButton type="submit">Review booking</PrimaryButton>
                        </form>
                    ) : null}

                    {this.state.step === 3 && selectedRoom ? (
                        <section className="meeting-room-confirmation">
                            {this.state.booked ? (
                                <div className="meeting-room-success" role="status">
                                    <h2>Meeting room booked</h2>
                                    <p>{selectedRoom.roomName} has been reserved successfully.</p>
                                </div>
                            ) : (
                                <h2>Review booking</h2>
                            )}
                            <dl>
                                <div><dt>Date</dt><dd>{this.state.date}</dd></div>
                                <div><dt>Time</dt><dd>{this.state.startTime} – {this.state.endTime}</dd></div>
                                <div><dt>Team</dt><dd>{this.state.practice}</dd></div>
                                <div><dt>Room</dt><dd>{selectedRoom.roomName}</dd></div>
                                <div><dt>Floor / Zone</dt><dd>{this.state.floor} / {this.state.zone}</dd></div>
                                <div><dt>Capacity</dt><dd>{selectedRoom.capacity}</dd></div>
                            </dl>
                            <PrimaryButton
                                disabled={Boolean(this.state.pendingRequestId)}
                                onClick={this.state.booked ? this.props.onBack : this.handleBook}
                            >
                                {this.state.booked
                                    ? "Return Home"
                                    : this.state.pendingRequestId
                                      ? "Booking..."
                                      : "Book Meeting Room"}
                            </PrimaryButton>
                        </section>
                    ) : null}
                </section>
                <ErrorDialog
                    message={this.state.errorMessage}
                    onDismiss={() => this.setState({ errorMessage: undefined })}
                />
            </main>
        );
    }
}
