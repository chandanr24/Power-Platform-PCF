import {
    createSeatKey,
    IEmployee,
    ISeat,
    ISeatException
} from "./BookingModels";

export const previewEmployees: IEmployee[] = [
    {
        employeeId: "EMP-1001",
        email: "alex.johnson@example.com",
        managerEmail: "manager@example.com",
        name: "Alex Johnson"
    },
    {
        employeeId: "EMP-1002",
        email: "priya.shah@example.com",
        managerEmail: "manager@example.com",
        name: "Priya Shah"
    },
    {
        employeeId: "EMP-1003",
        email: "daniel.lee@example.com",
        managerEmail: "manager@example.com",
        name: "Daniel Lee"
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
