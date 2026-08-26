import {
    createSeatKey,
    IEmployee,
    IBookingAccess,
    ISeat,
    ISeatBooking,
    ISeatException,
    ISeatRange,
    normalizeDateValue
} from "./BookingModels";

type DataSet = ComponentFramework.PropertyTypes.DataSet;

const unwrapSingleValue = (value: unknown): unknown =>
    Array.isArray(value) ? value[0] : value;

const getObjectText = (value: unknown, keys: string[]): string => {
    const unwrappedValue = unwrapSingleValue(value);

    if (typeof unwrappedValue !== "object" || unwrappedValue === null) {
        return "";
    }

    const record = unwrappedValue as Record<string, unknown>;

    for (const key of keys) {
        const candidate = record[key];

        if (typeof candidate === "string") {
            return candidate.trim();
        }

        if (typeof candidate === "number") {
            return String(candidate);
        }
    }

    return "";
};

const getJsonObjectText = (value: string, keys: string[]): string => {
    const trimmedValue = value.trim();

    if (!trimmedValue.startsWith("{") && !trimmedValue.startsWith("[")) {
        return "";
    }

    try {
        return getObjectText(JSON.parse(trimmedValue) as unknown, keys);
    } catch {
        return "";
    }
};

const getFormattedObjectText = (
    record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord,
    column: string,
    keys: string[]
): string => getJsonObjectText(record.getFormattedValue(column) ?? "", keys);

const getText = (
    record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord,
    column: string
): string => {
    const value = unwrapSingleValue(record.getValue(column));

    if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return String(value).trim();
    }

    return getObjectText(value, ["value", "Value", "name", "Name"]);
};

const getChoiceText = (
    record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord,
    column: string
): string => {
    const formattedValue = record.getFormattedValue(column);

    return formattedValue?.trim() || getText(record, column);
};

const getLookupText = (
    record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord,
    column: string
): string => {
    const value = record.getValue(column);
    const formattedValue = record.getFormattedValue(column)?.trim() ?? "";

    return (
        getObjectText(value, ["name", "Name", "value", "Value", "title", "Title"]) ||
        getFormattedObjectText(record, column, [
            "name",
            "Name",
            "value",
            "Value",
            "title",
            "Title"
        ]) ||
        formattedValue ||
        getText(record, column)
    );
};

const getWholeNumber = (
    record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord,
    column: string
): number => {
    const value = unwrapSingleValue(record.getValue(column));

    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.trunc(value);
    }

    const parsed = Number.parseInt(getText(record, column), 10);
    return Number.isFinite(parsed) ? parsed : 0;
};

const getPersonEmail = (
    record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord,
    column: string
): string => {
    const value = unwrapSingleValue(record.getValue(column));
    const formattedValue = record.getFormattedValue(column)?.trim() ?? "";

    if (typeof value === "string") {
        const trimmedValue = value.trim();

        if (trimmedValue.includes("@")) {
            return trimmedValue;
        }

        const jsonEmail = getJsonObjectText(trimmedValue, [
            "email",
            "Email",
            "mail",
            "Mail",
            "userPrincipalName",
            "UserPrincipalName",
            "name",
            "Name",
            "value",
            "Value"
        ]);

        if (jsonEmail.includes("@")) {
            return jsonEmail;
        }
    }

    if (formattedValue.includes("@")) {
        return formattedValue;
    }

    const emailKeys = [
        "email",
        "Email",
        "mail",
        "Mail",
        "userPrincipalName",
        "UserPrincipalName",
        "name",
        "Name",
        "value",
        "Value"
    ];

    const objectEmail =
        getObjectText(value, emailKeys) ||
        getFormattedObjectText(record, column, emailKeys);

    return objectEmail.includes("@") ? objectEmail : "";
};

const getMappedColumnNames = (
    dataSet: DataSet,
    propertySetAlias: string
): string[] => {
    const mappedNames = dataSet.columns
        .filter((column) => column.alias === propertySetAlias)
        .map((column) => column.name)
        .filter((name) => Boolean(name));

    return Array.from(new Set([propertySetAlias, ...mappedNames]));
};

const getMappedText = (
    dataSet: DataSet,
    record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord,
    propertySetAlias: string
): string => {
    for (const columnName of getMappedColumnNames(dataSet, propertySetAlias)) {
        const value = getText(record, columnName);

        if (value) {
            return value;
        }
    }

    return "";
};

const getMappedChoiceText = (
    dataSet: DataSet,
    record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord,
    propertySetAlias: string
): string => {
    for (const columnName of getMappedColumnNames(dataSet, propertySetAlias)) {
        const value = getChoiceText(record, columnName);

        if (value) {
            return value;
        }
    }

    return "";
};
const getMappedPersonEmail = (
    dataSet: DataSet,
    record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord,
    propertySetAlias: string
): string => {
    for (const columnName of getMappedColumnNames(dataSet, propertySetAlias)) {
        const email = getPersonEmail(record, columnName);

        if (email) {
            return email;
        }
    }

    return "";
};

const getDateTime = (
    record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord,
    column: string
): string => {
    const value = record.getValue(column);

    if (value instanceof Date) {
        return value.toISOString();
    }

    return typeof value === "string" ? value : "";
};

export const parseEmployeeDataSet = (dataSet: DataSet): IEmployee[] =>
    dataSet.sortedRecordIds
        .map((id) => dataSet.records[id])
        .filter(Boolean)
        .map((record) => ({
            employeeId: getMappedText(dataSet, record, "employeeId"),
            email: getMappedPersonEmail(dataSet, record, "employeePerson"),
            managerEmail: getMappedPersonEmail(
                dataSet,
                record,
                "managerPerson"
            ),
            name: getMappedText(dataSet, record, "employeeName"),
            teamId: getMappedChoiceText(dataSet, record, "employeeTeamId"),
            teamName: getMappedText(dataSet, record, "employeeTeamName")
        }))
        .filter((employee) => employee.employeeId && employee.name);

export const parseSeatRangeDataSet = (dataSet: DataSet): ISeat[] => {
    const ranges = dataSet.sortedRecordIds
        .map((id) => dataSet.records[id])
        .filter(Boolean)
        .map<ISeatRange | undefined>((record) => {
            const status = getChoiceText(record, "rangeStatus").toLowerCase();
            const range: ISeatRange = {
                endNumber: getWholeNumber(record, "endNumber"),
                floor: getChoiceText(record, "rangeFloor"),
                numberPadding: getWholeNumber(record, "numberPadding"),
                rangeId: getText(record, "rangeId"),
                seatPrefix: getText(record, "seatPrefix"),
                startNumber: getWholeNumber(record, "startNumber"),
                zone: getChoiceText(record, "rangeZone")
            };

            if (
                status !== "active" ||
                !range.rangeId ||
                !range.floor ||
                !range.zone ||
                !range.seatPrefix ||
                range.startNumber < 1 ||
                range.endNumber < range.startNumber ||
                range.endNumber - range.startNumber + 1 > 10000
            ) {
                return undefined;
            }

            return range;
        })
        .filter((range): range is ISeatRange => Boolean(range));

    const seatsByKey = new Map<string, ISeat>();

    for (const range of ranges) {
        const padding = Math.min(Math.max(range.numberPadding || 1, 1), 10);

        for (
            let seatNumberValue = range.startNumber;
            seatNumberValue <= range.endNumber;
            seatNumberValue += 1
        ) {
            const seatNumber =
                range.seatPrefix +
                String(seatNumberValue).padStart(padding, "0");
            const seatKey = createSeatKey(
                range.floor,
                range.zone,
                seatNumber
            );

            if (!seatsByKey.has(seatKey)) {
                seatsByKey.set(seatKey, {
                    floor: range.floor,
                    seatKey,
                    seatNumber,
                    zone: range.zone
                });
            }
        }
    }

    return Array.from(seatsByKey.values());
};

export const parseSeatExceptionDataSet = (
    dataSet: DataSet
): ISeatException[] =>
    dataSet.sortedRecordIds
        .map((id) => dataSet.records[id])
        .filter(Boolean)
        .map((record) => ({
            endDate:
                normalizeDateValue(record.getValue("exceptionEndDate")) ||
                undefined,
            seatKey: getText(record, "exceptionSeatKey").toLowerCase(),
            startDate:
                normalizeDateValue(record.getValue("exceptionStartDate")) ||
                undefined,
            status: getChoiceText(record, "exceptionStatus")
        }))
        .filter((exception) => exception.seatKey && exception.status);

interface BookingColumnAliases {
    bookingDate: string;
    bookingEmployee: string;
    bookingEmployeeId: string;
    bookingFloor: string;
    bookingId: string;
    bookingKey: string;
    bookingManager: string;
    bookingSeat: string;
    bookingSeatKey: string;
    bookingSeatNumber: string;
    bookingStatus: string;
    bookingTeamId: string;
    bookingTeamName: string;
    bookingZone: string;
    createdBy: string;
    reservationExpiresAt: string;
};

const parseBookingDataSetWithAliases = (
    dataSet: DataSet,
    aliases: BookingColumnAliases
): ISeatBooking[] =>
    dataSet.sortedRecordIds
        .map((id) => dataSet.records[id])
        .filter(Boolean)
        .map((record) => {
            const bookingKey = getText(record, aliases.bookingKey);
            const bookingKeyParts = bookingKey.split("|");
            const floor = getChoiceText(record, aliases.bookingFloor);
            const zone = getChoiceText(record, aliases.bookingZone);
            const seatNumber =
                getText(record, aliases.bookingSeatNumber) ||
                getLookupText(record, aliases.bookingSeat) ||
                bookingKeyParts[3] ||
                "";
            const seatKey =
                getText(record, aliases.bookingSeatKey).toLowerCase() ||
                createSeatKey(floor, zone, seatNumber);

            return {
                bookingId: getText(record, aliases.bookingId),
                bookingDate: normalizeDateValue(record.getValue(aliases.bookingDate)),
                bookingKey,
                createdByEmail: getPersonEmail(record, aliases.createdBy),
                employeeEmail: getPersonEmail(record, aliases.bookingEmployee),
                employeeId: getText(record, aliases.bookingEmployeeId),
                employeeName: getLookupText(record, aliases.bookingEmployee),
                expiresAt: getDateTime(record, aliases.reservationExpiresAt) || undefined,
                floor,
                managerEmail: getMappedPersonEmail(dataSet, record, aliases.bookingManager),
                seatKey,
                seatNumber,
                status: getChoiceText(record, aliases.bookingStatus),
                teamId: getMappedChoiceText(dataSet, record, aliases.bookingTeamId),
                teamName: getMappedText(dataSet, record, aliases.bookingTeamName),
                zone
            };
        })
        .filter((booking) => booking.bookingDate && booking.seatKey);

const activeBookingAliases: BookingColumnAliases = {
    bookingDate: "bookingDate",
    bookingEmployee: "bookingEmployee",
    bookingEmployeeId: "bookingEmployeeId",
    bookingFloor: "bookingFloor",
    bookingId: "bookingId",
    bookingKey: "bookingKey",
    bookingManager: "bookingManagerEmail",
    bookingSeat: "bookingSeat",
    bookingSeatKey: "bookingSeatKey",
    bookingSeatNumber: "bookingSeatNumber",
    bookingStatus: "bookingStatus",
    bookingTeamId: "bookingTeamId",
    bookingTeamName: "bookingTeamName",
    bookingZone: "bookingZone",
    createdBy: "bookingCreatedBy",
    reservationExpiresAt: "reservationExpiresAt"
};

const historyBookingAliases: BookingColumnAliases = {
    bookingDate: "historyBookingDate",
    bookingEmployee: "historyBookingEmployee",
    bookingEmployeeId: "historyBookingEmployeeId",
    bookingFloor: "historyBookingFloor",
    bookingId: "historyBookingId",
    bookingKey: "historyBookingKey",
    bookingManager: "historyBookingManager",
    bookingSeat: "historyBookingSeat",
    bookingSeatKey: "historyBookingSeatKey",
    bookingSeatNumber: "historyBookingSeatNumber",
    bookingStatus: "historyBookingStatus",
    bookingTeamId: "historyBookingPractice",
    bookingTeamName: "historyBookingPracticeName",
    bookingZone: "historyBookingZone",
    createdBy: "historyBookingCreatedBy",
    reservationExpiresAt: "historyReservationExpiresAt"
};

export const parseBookingDataSet = (dataSet: DataSet): ISeatBooking[] =>
    parseBookingDataSetWithAliases(dataSet, activeBookingAliases);

export const parseMyBookingsDataSet = (dataSet: DataSet): ISeatBooking[] =>
    parseBookingDataSetWithAliases(dataSet, historyBookingAliases);
export const parseBookingAccessDataSet = (dataSet: DataSet): IBookingAccess[] =>
    dataSet.sortedRecordIds
        .map((id) => dataSet.records[id])
        .filter(Boolean)
        .map((record) => ({
            role: getChoiceText(record, "accessRole"),
            teamId: getMappedChoiceText(dataSet, record, "accessTeamId"),
            userEmail: getMappedPersonEmail(dataSet, record, "accessUser")
        }))
        .filter((access) => access.role && access.userEmail);
