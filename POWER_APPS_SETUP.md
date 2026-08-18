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
| `Employee` | Person | required, single selection |
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
| `employeePerson` | internal name of `EmployeeMail` |
| `managerPerson` | internal name of `Manager` |

Version 0.0.13 resolves the `employeeId` and `employeeName` property-set
mappings to their bound SharePoint columns before reading the values. Bind
these properties to `EmpCode` and `EmployeeName`; do not duplicate or rename
the SharePoint columns to match the PCF aliases.

In the Book Seat employee selector, users search by employee name or employee
code only. Search results and selected employees display `EmployeeName` and
`EmpCode`; the employee email is not shown and is not included in search. The
search placeholder is **Search employee name or code**.

`employeePerson` and `managerPerson` are `Lookup.Simple`; React extracts the
email from each native SharePoint Person object. In SharePoint List settings,
configure both `EmployeeMail` and `Manager` with **Show field = Work email** so
the PCF dataset also receives the email as the formatted lookup value. Keep
these mappings even though email is hidden in the Book Seat UI: the control
uses email internally for employee identity, duplicate checks, existing-booking
validation, and authorization.

Power Apps may expose a `Lookup.Simple` Person value through `Email`, `Mail`,
UPN, `name`, or `value`, depending on the Canvas and SharePoint runtime shape.
Version 0.0.13 accepts all of these shapes but uses a candidate only when it
contains `@`; a person's display name is therefore never treated as an email.

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
| `bookingCreatedBy` | `Author` unless the field selector shows otherwise |
| `bookingStatus` | internal name of `Status` |
| `bookingFloor` | internal name of `Floor` |
| `bookingZone` | internal name of `Zone` |
| `bookingKey` | internal name of `BookingKey` |
| `reservationExpiresAt` | internal name of `ReservationExpiresAt` |

`bookingEmployee` and `bookingCreatedBy` are native `Lookup.Simple` properties.
React extracts the Person emails. The optional `bookingSeat` lookup is read only
as a legacy fallback while existing booking rows are being backfilled.

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
SeatKey: Text(requestAssignment.seatKey),
SeatNumber: Text(requestAssignment.seatNumber),
Floor: {Value: Text(requestAssignment.floor)},
Zone: {Value: Text(requestAssignment.zone)}
```

Do not patch the legacy `WorkStationNumber` lookup for new virtual bookings.
The request's `bookingKey` remains the value written to the unique BookingKey
column.

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
`SeatKey`, `ReservationExpiresAt`, `Employee`, `Author`, and the unique
`BookingKey`.

## Reservation cleanup flow

Run a scheduled Power Automate flow every five minutes:

1. Get SeatBookings where Status is `Selected`.
2. Keep records whose `ReservationExpiresAt` is earlier than `utcNow()`.
3. Change Status to `Cancelled`.
4. Change BookingKey to `original-key|expired|ID`.

Filtering the Canvas UI is not a SharePoint security boundary. Keep Employees
read-only and grant SeatBookings create/update rights only to approved managers
and administrators.
