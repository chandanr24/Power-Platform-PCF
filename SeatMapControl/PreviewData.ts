import {
    createSeatKey,
    IEmployee,
    IMeetingRoom,
    IMeetingRoomBooking,
    ISeat,
    ISeatException,
    normalizeDateValue
} from "./BookingModels";

export const previewEmployees: IEmployee[] = [
    {
        employeeId: "EMP-1001",
        email: "alex.johnson@example.com",
        managerEmail: "manager@example.com",
        name: "Alex Johnson",
        teamId: "preview-team",
        teamName: "Preview Team"
    },
    {
        employeeId: "EMP-1002",
        email: "priya.shah@example.com",
        managerEmail: "manager@example.com",
        name: "Priya Shah",
        teamId: "preview-team",
        teamName: "Preview Team"
    },
    {
        employeeId: "EMP-1003",
        email: "daniel.lee@example.com",
        managerEmail: "manager@example.com",
        name: "Daniel Lee",
        teamId: "preview-team",
        teamName: "Preview Team"
    }
];

export const previewSeats: ISeat[] = Array.from(
    { length: 48 },
    (_, index) => {
        const floor = "Floor 1";
        const seatNumber = `WS-${String(index + 1).padStart(2, "0")}`;
        const zone = index < 24 ? "Zone A" : "Zone B";

        return {
            floor,
            seatKey: createSeatKey(floor, zone, seatNumber),
            seatNumber,
            zone
        };
    }
);

export const previewSeatExceptions: ISeatException[] = [11, 28].map(
    (index) => {
        const floor = "Floor 1";
        const seatNumber = `WS-${String(index + 1).padStart(2, "0")}`;
        const zone = index < 24 ? "Zone A" : "Zone B";

        return {
            seatKey: createSeatKey(floor, zone, seatNumber),
            status: "Maintenance"
        };
    }
);

export const previewMeetingRooms: IMeetingRoom[] = [
    {
        capacity: 8,
        floor: "Floor 1",
        roomId: "1",
        roomKey: "floor-1|zone-a|conf-1",
        roomName: "Conference Room 1",
        status: "Active",
        zone: "Zone A"
    },
    {
        capacity: 14,
        floor: "Floor 1",
        roomId: "2",
        roomKey: "floor-1|zone-a|conf-2",
        roomName: "Conference Room 2",
        status: "Active",
        zone: "Zone A"
    }
];

const getPreviewTime = (minuteOffset: number): string => {
    const value = new Date(Date.now() + minuteOffset * 60 * 1000);

    return `${String(value.getHours()).padStart(2, "0")}:${String(
        value.getMinutes()
    ).padStart(2, "0")}`;
};

export const previewMeetingRoomBookings: IMeetingRoomBooking[] = [
    {
        bookedByEmail: "manager@example.com",
        bookingDate: normalizeDateValue(new Date()),
        bookingId: "preview-meeting-1",
        endTime: getPreviewTime(30),
        practice: "Preview Team",
        roomKey: "floor-1|zone-a|conf-1",
        startTime: getPreviewTime(-15),
        status: "Booked"
    },
    {
        bookedByEmail: "manager@example.com",
        bookingDate: normalizeDateValue(new Date()),
        bookingId: "preview-meeting-2",
        endTime: getPreviewTime(90),
        practice: "Preview Team",
        roomKey: "floor-1|zone-a|conf-2",
        startTime: getPreviewTime(45),
        status: "Booked"
    }
];
