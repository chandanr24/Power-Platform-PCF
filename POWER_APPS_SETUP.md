# Power Apps and SharePoint setup

The production configuration binds SharePoint lists directly to the PCF. Do
not use `AddColumns`, `ClearCollect`, or local collections for these datasets.
Direct binding preserves SharePoint delegation and the native Person, Lookup,
Choice, Date, number, and text column metadata required by PCF property sets.

The control configures a page size of 500 and continues requesting subsequent
pages until the filtered dataset is complete. Keep the Power Fx filters
delegable so SharePoint reduces the records before they reach the control.

## Required SharePoint columns

### Employees

| Display name | SharePoint type | Used by PCF as |
| --- | --- | --- |
| `EmpCode` | Single line of text | employee ID |
| `EmployeeName` | Single line of text | display name |
| `EmployeeMail` | Person, single selection | employee identity/email |
| `Manager` | Person, single selection | reporting manager identity/email |

### SeatRanges

| Display name | SharePoint type | Used by PCF as |
| --- | --- | --- |
| `ID` | System ID | range ID |
| `Floor` | Choice, single selection | floor |
| `Zone` | Choice, single selection | zone |
| `SeatPrefix` | Single line of text | prefix such as `WS-` |
| `StartNumber` | Number, zero decimal places | first seat number |
| `EndNumber` | Number, zero decimal places | last seat number |
| `NumberPadding` | Number, zero decimal places | digit padding such as `3` |
| `Status` | Choice, single selection | `Active` or `Inactive` |

Each active Floor-Zone row generates its virtual seats. For example, prefix
`WS-`, start `1`, end `10`, and padding `3` generates `WS-001` through
`WS-010`.

### SeatExceptions

| Display name | SharePoint type | Used by PCF as |
| --- | --- | --- |
| `ID` | System ID | exception ID |
| `SeatKey` | Single line of text | virtual seat identity |
| `Status` | Choice, single selection | `Maintenance` or `Disabled` |
| `StartDate` | Date and Time | optional inclusive first blocked date |
| `EndDate` | Date and Time | optional inclusive last blocked date |

Blank StartDate and EndDate make the exception indefinite. Floor, Zone,
SeatNumber, and Reason may remain in the list for administration but are not
required by the PCF dataset.

### SeatBookings

| Display name | SharePoint type | Notes |
| --- | --- | --- |
| `ID` | System ID | booking ID |
| `BookingDate` | Date and Time | required |
| `WorkStationNumber` | Lookup to WorkStationNumber | legacy, optional during migration |
| `SeatKey` | Single line of text | required for new virtual bookings |
| `SeatNumber` | Single line of text | required for new virtual bookings |
| `Employee` | Person | required, single selection; populated from Employees by EmpCode |
| `EmployeeId` | Single line of text | required for new bookings; immutable EmpCode snapshot |
| `Status` | Choice | `Selected`, `Booked`, `Cancelled` |
| `Floor` | Choice | required |
| `Zone` | Choice | required |
| `BookingKey` | Single line of text | required and enforce unique values |
| `ReservationExpiresAt` | Date and Time | optional |
| `CancellationEmailSent` | Single line of text | give a default value or make optional |
| `Created By` | System Person column | internal name normally `Author` |

The active booking-key format is:

```text
YYYY-MM-DD|floor|zone|seat-number
```

Release a key without deleting booking history:

```text
original-key|cancelled|sharepoint-id
```

Before switching the Canvas app to version 0.0.8, backfill existing booking
rows while their WorkStationNumber lookups are still populated:

```text
SeatNumber = WorkStationNumber lookup Title
SeatKey = lower(Floor + "|" + Zone + "|" + SeatNumber)
```

Do not clear the legacy lookup. Version 0.0.8 can read it as a temporary
fallback, but every new booking must write SeatKey and SeatNumber directly.

## Internal names

PCF property-set mappings require SharePoint internal/logical names. Verify each
name in **List settings > Column** and read the value after `Field=` in the URL.
Renaming a SharePoint display name does not change its internal name. `Created
By` normally maps as `Author`; imported columns may map as `field_1`, `field_2`,
and so on.

## Delegable Canvas bindings

Microsoft SharePoint delegates `Filter`, `LookUp`, `=`, `And`, and `Or` for the
types used here. For Person columns, `Email` and `DisplayName` are delegable.
Do not apply `Lower` or other string-transformation functions to a SharePoint
column inside `Filter` or `LookUp`.

### Employees: primary `Items`

The requirement is that a manager can book for themselves and their reportees:

```powerfx
Filter(
    Employees,
    EmployeeMail.Email = User().Email ||
    Manager.Email = User().Email
)
```

Map the PCF property-set fields directly:

| PCF property | SharePoint internal name |
| --- | --- |
| `employeeId` | internal name of `EmpCode` |
| `employeeName` | internal name of `EmployeeName` |
| `employeePerson` | optional internal name of `EmployeeMail` |
| `managerPerson` | optional internal name of `Manager` |

Version 0.0.15 resolves `employeeId` and `employeeName` from the bound
SharePoint columns. Bind these to `EmpCode` and `EmployeeName`; do not duplicate
or rename the SharePoint columns to match PCF aliases.

In the Book Seat selector, users search by employee name or employee code only.
Search results and selected employees display `EmployeeName` and `EmpCode`; no
email is displayed, searched, or required to continue to seat selection.

`employeePerson` and `managerPerson` are optional. Leave both unmapped when
Power Apps filters the Employees dataset and the PCF should work with name and
ID only. If they are mapped, the PCF can retain its optional client-side
manager/self filtering and use email only as a legacy duplicate fallback.

Keep `EmployeeMail` in the Employees SharePoint list. Power Apps or Power
Automate resolves it by `EmpCode` after a booking is confirmed; the PCF does
not send employee email in `actionRequestJson`.

### Seat ranges: `seatRangesDataSet_Items`

Only active ranges need to reach the booking UI:

```powerfx
Filter(
    SeatRanges,
    Status.Value = "Active"
)
```

Map directly:

| PCF property | SharePoint internal name |
| --- | --- |
| `rangeId` | `ID` |
| `rangeFloor` | internal name of `Floor` |
| `rangeZone` | internal name of `Zone` |
| `seatPrefix` | internal name of `SeatPrefix` |
| `startNumber` | internal name of `StartNumber` |
| `endNumber` | internal name of `EndNumber` |
| `numberPadding` | internal name of `NumberPadding` |
| `rangeStatus` | internal name of `Status` |

Floor, Zone, and Status are native PCF `OptionSet` properties. React reads their
formatted labels and generates a stable lowercase `floor|zone|seat-number`
SeatKey for each virtual seat.

### Seat exceptions: `seatExceptionsDataSet_Items`

Use:

```powerfx
Filter(
    SeatExceptions,
    Status.Value = "Maintenance" ||
    Status.Value = "Disabled"
)
```

Map directly:

| PCF property | SharePoint internal name |
| --- | --- |
| `exceptionId` | `ID` |
| `exceptionSeatKey` | internal name of `SeatKey` |
| `exceptionStatus` | internal name of `Status` |
| `exceptionStartDate` | internal name of `StartDate` |
| `exceptionEndDate` | internal name of `EndDate` |

### Bookings: `seatBookingsDataSet_Items`

The booking UI needs only current/future active bookings:

```powerfx
Filter(
    SeatBookings,
    BookingDate >= Today() &&
    (
        Status.Value = "Selected" ||
        Status.Value = "Booked"
    )
)
```

Map directly:

| PCF property | SharePoint internal name |
| --- | --- |
| `bookingId` | `ID` |
| `bookingDate` | internal name of `BookingDate` |
| `bookingSeat` | internal name of legacy `WorkStationNumber` lookup, optional |
| `bookingSeatKey` | internal name of `SeatKey` |
| `bookingSeatNumber` | internal name of `SeatNumber` |
| `bookingEmployee` | internal name of `Employee` |
| `bookingEmployeeId` | internal name of `EmployeeId` |
| `bookingCreatedBy` | `Author` unless the field selector shows otherwise |
| `bookingStatus` | internal name of `Status` |
| `bookingFloor` | internal name of `Floor` |
| `bookingZone` | internal name of `Zone` |
| `bookingKey` | internal name of `BookingKey` |
| `reservationExpiresAt` | internal name of `ReservationExpiresAt` |

Store the employee's `EmpCode` in `EmployeeCode` whenever a SeatBookings row is created; this preserves the Employee ID even if the employee profile later changes.

### Cancel Booking rules

The Cancel Booking screen displays only completed bookings (`Status = "Booked"`) dated today or later. It provides optional Employee Code or Employee Name and Booking Date filters, followed by a single-choice selection. The **Cancel selected booking** button remains disabled until one booking is selected and then requires confirmation before sending the `release` action.

`bookingEmployee` and `bookingCreatedBy` are native `Lookup.Simple` properties.
`bookingEmployeeId` is the EmpCode snapshot used for active duplicate-booking
checks. Populate it for every new booking. The optional `bookingSeat` lookup is
read only as a legacy fallback while existing booking rows are being backfilled.
Legacy rows without EmployeeId use Person email only as a temporary fallback.

## Authentication and permissions

Use this delegable authorization formula for `currentUserEmail`:

```powerfx
If(
    !IsBlank(
        LookUp(
            Employees,
            EmployeeMail.Email = User().Email ||
            Manager.Email = User().Email,
            ID
        )
    ),
    User().Email,
    Blank()
)
```

Only managers with at least one reportee may create bookings:

```powerfx
canCreateBookings =
!IsBlank(
    LookUp(
        Employees,
        Manager.Email = User().Email,
        ID
    )
)
```

Use these remaining inputs:

```powerfx
previewMode = false
canBookForAnyone = false
maximumPeoplePerBooking = 30
actionResultJson = varSeatBookingActionResult
```

Version 0.0.13 also treats a blank, invalid, or zero
`maximumPeoplePerBooking` input as `30`. A positive value supplied by Canvas is
used as configured.

The React control repeats the manager/self filter as a client-side defense, but
the delegable `Items` formula is the server-side scope that prevents unrelated
employees from being downloaded.

## Screen initialization

No Employees collection is required. Remove `ClearCollect(colPcfEmployees, ...)`.

`Screen1.OnVisible` only needs to initialize the action result:

```powerfx
Refresh(SeatRanges);
Refresh(SeatExceptions);
Refresh(SeatBookings);
Set(varSeatBookingActionResult, "")
```

## Booking command handling

Use `SeatMapControl1.OnChange` to process `actionRequestJson`. The
`actionSequence` output increments for every `reserve`, `release`,
`releaseGroup`, or `confirmGroup` request. Direct `Patch` calls are not subject
to query delegation. Any record lookup performed before a patch must use a
delegable key comparison, preferably SharePoint `ID = Value(...)` or the unique
`BookingKey = ...`.

The actions are:

| Action | SharePoint operation |
| --- | --- |
| `reserve` | Create `Selected` records with a 10-minute expiry |
| `release` | Change one record to `Cancelled` and release its unique key |
| `releaseGroup` | Release all temporary records in the request |
| `confirmGroup` | Change all temporary records in the request to `Booked` |

Return the result through `varSeatBookingActionResult`:

```json
{
  "requestId": "request-id-from-the-command",
  "action": "reserve",
  "success": true,
  "records": [
    {
      "bookingId": "1842",
      "bookingKey": "2026-07-30|1|A|WS-01",
      "seatKey": "1|a|ws-01",
      "expiresAt": "2026-07-30T10:10:00.000Z"
    }
  ]
}
```

After every successful write, call:

```powerfx
Refresh(SeatBookings)
```

Catch the SharePoint unique-value error on `BookingKey` and return a failed
action result so two managers cannot reserve the same seat/date key.

For a `reserve` request, write the request assignment values directly to the
new booking snapshot columns:

```powerfx
EmployeeId: Text(requestAssignment.employeeId),
Employee: LookUp(
    Employees,
    EmpCode = Text(requestAssignment.employeeId),
    EmployeeMail
),
SeatKey: Text(requestAssignment.seatKey),
SeatNumber: Text(requestAssignment.seatNumber),
Floor: {Value: Text(requestAssignment.floor)},
Zone: {Value: Text(requestAssignment.zone)}
```

Do not patch the legacy `WorkStationNumber` lookup for new virtual bookings.
The request's `bookingKey` remains the value written to the unique BookingKey
column. It atomically prevents two users from reserving the same seat on the
same date. The PCF additionally checks EmployeeId for normal duplicate booking
prevention and ignores `Selected` records whose ReservationExpiresAt has passed.

A single BookingKey cannot atomically protect both a seat and an employee across
different seats. If strict cross-seat employee concurrency is later required,
add a separate unique employee/date key or serialize that validation in the
backend flow.

## Confirmation email flow

After a successful `confirmGroup` result, Power Apps can call a Power Apps (V2)
flow once per confirmed assignment. Pass only `EmployeeId` and `BookingKey`.
The flow should:

1. Get the matching Employees record using `EmpCode = EmployeeId`.
2. Read `EmployeeMail.Email` from that record.
3. Send the confirmation email using that address.

Do not call the flow for `reserve`, `release`, or expired reservations. The PCF
does not pass employee email; the backend lookup makes the Employees list the
source of truth for notifications.

## Delegation rules for this app

Use:

- direct SharePoint datasets
- `Filter` and `LookUp` with `=`
- `And`/`Or`
- `EmployeeMail.Email` and `Manager.Email`
- indexed SharePoint columns for high-volume filters
- PCF paging for the filtered result

Avoid for production datasource retrieval:

- `AddColumns` aliases over an entire SharePoint list
- `ClearCollect` from an entire SharePoint list
- `Lower`, `Upper`, or `Text` applied to datasource columns in a query
- `CountRows(SharePointList)` as an accuracy check
- client-only filtering of a complete organization-wide Employees list

Recommended SharePoint indexes are Employees `Manager`, `EmployeeMail`, and
`EmpCode`; SeatRanges `Status`, `Floor`, and `Zone`; SeatExceptions `SeatKey`,
`Status`, `StartDate`, and `EndDate`; and SeatBookings `BookingDate`, `Status`,
`SeatKey`, `ReservationExpiresAt`, `Employee`, `EmployeeId`, `Author`, and the
unique `BookingKey`.

## Reservation cleanup flow

Run a scheduled Power Automate flow every five minutes:

1. Get SeatBookings where Status is `Selected`.
2. Keep records whose `ReservationExpiresAt` is earlier than `utcNow()`.
3. Change Status to `Cancelled`.
4. Change BookingKey to `original-key|expired|ID`.

Filtering the Canvas UI is not a SharePoint security boundary. Keep Employees
read-only and grant SeatBookings create/update rights only to approved managers
and administrators.

## Scrollable selection areas

Set the `cancelBookingVisibleRecordCount` input from a Power Apps formula. It has no code default: a positive value sets the number of Cancel Booking rows visible before the list scrolls; leave it blank to avoid applying a row limit. The Seat Selection screen always scrolls only its virtual-seat grid, so additional virtual seats do not increase the card height.

## Book Seat required fields

In the Book Seat screen, users must explicitly select both Floor and Zone before **View Available Seats** is enabled. Zone remains unavailable until a Floor is selected; no Floor, Zone, or `All Zones` value is preselected.

## Employee search keyboard controls

In the Book Seat employee search, use **Arrow Down** and **Arrow Up** to move through visible results, **Enter** to add the highlighted employee, and **Escape** to close the results.

## Booking date calendar

The Book Seat date calendar closes when the user selects a date, clicks/taps outside it, or moves keyboard focus to another control.

Cancel Booking resolves EmployeeName from the Employees dataset using the booking EmployeeCode; it displays the name and allows searches by either code or name.

## My Bookings history, access, and pagination

My Bookings is a read-only booking-history screen. It displays all booking
statuses and dates that are supplied to its dataset, then applies the access
scope before the user-facing filters:

- Employee: only their own booking history.
- Manager: only direct reporters' history.
- Practice Lead: only the Team IDs assigned to them.
- HR: all booking history.

This browser-side scope improves the screen experience but is not a security
boundary. Configure SharePoint or Dataverse permissions and a server-filtered
`myBookingsDataSet_Items` formula so users are not sent unauthorized records.
Index SeatBookings `BookingDate`, `EmployeeId`, `Manager`, and `Practice`.

### Required history snapshots

Add these immutable snapshots to SeatBookings and populate them when each
booking is reserved. Existing records must be backfilled before historical
manager or team filtering can be complete.

| Display name | Type | Purpose |
| --- | --- | --- |
| `Manager` | Person, single selection | manager identity at booking time |
| `TeamId` | Single line of text | stable team identifier at booking time |
| `TeamName` | Single line of text | optional display label at booking time |

Add optional `TeamId` and `TeamName` columns to Employees. Map them as
`employeeTeamId` and `employeeTeamName`.

### BookingAccess list

Create one access record per elevated assignment:

| Display name | Type | Values |
| --- | --- | --- |
| `User` | Person, single selection | the HR user or Practice Lead |
| `Role` | Choice | `HR` or `Practice Lead` |
| `TeamId` | Single line of text | required for Practice Lead; blank for HR |

A Practice Lead with several teams needs one `BookingAccess` row for each TeamId.
No access row is required for an employee or direct manager.

### PCF mappings

Map `myBookingsDataSet_Items` to the SeatBookings source that contains booking
history. Map the property sets with the same internal names as the
`seatBookingsDataSet_Items` mapping, including `bookingManagerEmail` (map to the `Manager` Person column),
`bookingTeamId`, and `bookingTeamName`.

Map `bookingAccessDataSet_Items` to BookingAccess:

| PCF property | SharePoint internal name |
| --- | --- |
| `accessUser` | internal name of `User` |
| `accessRole` | internal name of `Role` |
| `accessTeamId` | internal name of `TeamId` |

Set `myBookingsPageSize` with a Power Fx formula such as `10`. It has no PCF
fallback value: leave it blank to display the supplied, authorized results in
one page; set a positive number to enable the Previous/Next pager.

When creating a SeatBookings record, resolve the employee by EmpCode and write
`Manager`, and `Practice` together with the existing EmployeeId
snapshot. Do not derive these historic values from a later employee profile
change.
