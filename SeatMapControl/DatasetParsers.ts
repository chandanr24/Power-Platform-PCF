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
            teamId: getMappedText(dataSet, record, "employeeTeamId"),
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

export const parseBookingDataSet = (dataSet: DataSet): ISeatBooking[] =>
    dataSet.sortedRecordIds
        .map((id) => dataSet.records[id])
        .filter(Boolean)
        .map((record) => {
            const bookingKey = getText(record, "bookingKey");
            const bookingKeyParts = bookingKey.split("|");
            const floor = getChoiceText(record, "bookingFloor");
            const zone = getChoiceText(record, "bookingZone");
            const seatNumber =
                getText(record, "bookingSeatNumber") ||
                getLookupText(record, "bookingSeat") ||
                bookingKeyParts[3] ||
                "";
            const seatKey =
                getText(record, "bookingSeatKey").toLowerCase() ||
                createSeatKey(floor, zone, seatNumber);

            return {
                bookingId: getText(record, "bookingId"),
                bookingDate: normalizeDateValue(
                    record.getValue("bookingDate")
                ),
                bookingKey,
                createdByEmail: getPersonEmail(record, "bookingCreatedBy"),
                employeeEmail: getPersonEmail(record, "bookingEmployee"),
                employeeId: getText(record, "bookingEmployeeId"),
                employeeName: getLookupText(record, "bookingEmployee"),
                expiresAt:
                    getDateTime(record, "reservationExpiresAt") || undefined,
                floor,
                managerEmail: getMappedPersonEmail(dataSet, record, "bookingManagerEmail"),
                seatKey,
                seatNumber,
                status: getChoiceText(record, "bookingStatus"),
                teamId: getMappedText(dataSet, record, "bookingTeamId"),
                teamName: getMappedText(dataSet, record, "bookingTeamName"),
                zone
            };
        })
        .filter((booking) => booking.bookingDate && booking.seatKey);

export const parseBookingAccessDataSet = (dataSet: DataSet): IBookingAccess[] =>
    dataSet.sortedRecordIds
        .map((id) => dataSet.records[id])
        .filter(Boolean)
        .map((record) => ({
            role: getChoiceText(record, "accessRole"),
            teamId: getMappedText(dataSet, record, "accessTeamId"),
            userEmail: getMappedPersonEmail(dataSet, record, "accessUser")
        }))
        .filter((access) => access.role && access.userEmail);
