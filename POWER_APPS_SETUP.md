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

The Cancel Booking screen displays only completed bookings (`Status = "Booked"`) dated today or later. It provides optional Employee Code or Employee Name and Booking Date filters, followed by multi-selection of up to five eligible bookings. The **Cancel selected bookings (n)** button remains disabled until at least one booking is selected and then requires confirmation before sending the separate `cancelGroup` action. Temporary `Selected` reservation release continues to use `release` and `releaseGroup`.

Before those filters are applied, the screen restricts records to the signed-in
employee and that employee's direct manager. App ownership, Created By, and
SharePoint site ownership do not grant a Cancel Booking visibility bypass.
Employee and Created By Person values are resolved through both their PCF
aliases and mapped SharePoint internal column names.

`bookingEmployee` and `bookingCreatedBy` are native `Lookup.Simple` properties.
`bookingEmployeeId` is the EmpCode snapshot used for active duplicate-booking
checks. Populate it for every new booking. The optional `bookingSeat` lookup is
read only as a legacy fallback while existing booking rows are being backfilled.
Legacy rows without EmployeeId use Person email only as a temporary fallback.

## Home dashboard values

The Home screen resolves the welcome name by matching
`currentUserEmployeeCode` to the Employees `employeeId` mapping. If no mapped
employee matches, it uses the part of `currentUserEmail` before `@`, then
`User` as the final fallback. No additional PCF property is required.

The Home seat totals are calculated from the mapped datasets:

- **Total Seat Capacity** is the number of unique virtual seats generated from
  the active SeatRanges dataset.
- **Booked Seats** is the number of unique current-capacity seats with an
  active `Booked` record for today.
- **Seat Availability** is total capacity minus today's active `Booked` or
  unexpired `Selected` seats and active `Maintenance` or `Disabled`
  SeatExceptions. Duplicate booking or exception rows cannot reduce the count
  more than once because the calculation uses unique SeatKeys.

Meeting room totals remain unchanged until meeting-room data is implemented.
To make external SeatRanges, SeatExceptions, or SeatBookings changes visible
when the screen initializes, keep these refreshes in `Screen1.OnVisible`:

```powerfx
Refresh(SeatRanges);
Refresh(SeatExceptions);
Refresh(SeatBookings)
```

The PCF recalculates the Home values whenever those mapped datasets refresh; it
does not poll continuously.
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

Set `currentUserEmployeeCode` from the same Employees source:

```powerfx
LookUp(
    Employees,
    EmployeeMail.Email = User().Email,
    EmpCode
)
```

Employee and direct-manager authorization in Cancel Booking and My Bookings
uses this stable EmpCode together with the server-scoped Employees dataset.
Person email remains a legacy fallback for historical records.

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
### Sign out

Version 1.3.28 replaces the Home sidebar Profile item with **Sign out**. The
control clears its temporary booking state, returns to its login view, and
increments the dedicated `signOutSequence` output. Keep sign-out separate from
`actionRequestJson` so reserve, release, and confirmation processing is
unchanged.

Wrap the existing `SeatMapControl1.OnChange` booking-action formula with this
condition:

```powerfx
If(
    SeatMapControl1.signOutSequence >
        Coalesce(varHandledSignOutSequence, 0),
    Set(
        varHandledSignOutSequence,
        SeatMapControl1.signOutSequence
    );
    Exit(true),
    /* existing complete booking-action formula */
)
```

`Exit(true)` signs the current user out of Power Apps only in a running,
published app. Power Apps Studio does not exit or sign out while authoring, so
test this behaviour from the published app. Power Apps may return the user to
its app list or Microsoft sign-in page; opening the app again requires the user
to authenticate.

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

For same-day updates while the single Canvas screen remains open, add a Timer named `tmrDashboardRefresh` to that screen and use:

```powerfx
Duration = 60000
Repeat = true
AutoStart = true
AutoPause = false
Visible = false
```

Set its `OnTimerEnd` to:

```powerfx
Refresh(SeatBookings);
Refresh(SeatRanges);
Refresh(SeatExceptions)
```

The Timer refreshes the mapped datasets every 60 seconds. The PCF then recalculates today's Booked Seats and Seat Availability, including bookings or cancellations made by other users. The Timer text is irrelevant while `Visible` is false.

## Booking command handling

Use `SeatMapControl1.OnChange` to process `actionRequestJson`. The
`actionSequence` output increments for every `reserve`, `release`,
`releaseGroup`, `confirmGroup`, or `cancelGroup` request. Direct `Patch` calls are not subject
to query delegation. Any record lookup performed before a patch must use a
delegable key comparison, preferably SharePoint `ID = Value(...)` or the unique
`BookingKey = ...`.

The actions are:

| Action | SharePoint operation |
| --- | --- |
| `reserve` | Create `Selected` records with a five-minute expiry |
| `release` | Change one record to `Cancelled` and release its unique key |
| `releaseGroup` | Release all temporary records in the request |
| `confirmGroup` | Change all temporary records in the request to `Booked` |
| `cancelGroup` | Cancel up to five already `Booked` records dated today or later; it is handled by a distinct Canvas branch and then triggers the cancellation-email flow |

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

In `SeatMapControl1.OnChange`, place `Refresh(SeatBookings);` immediately before the success `Set(varSeatBookingActionResult, ...)` in each `reserve`, `release`, `releaseGroup`, `confirmGroup`, and `cancelGroup` branch. This refreshes the PCF dataset after a successful write; it is not continuous polling. A simultaneous reservation conflict is reported by the unique `BookingKey` write, after which the seat map unlocks and the user can choose another seat.

The PCF applies a 10-second recovery timeout only while waiting for a `reserve`
result. A matching success or failure result cancels the timeout immediately. If
Power Apps does not return a matching `requestId`—for example, when a
SharePoint unique-value error escapes the Canvas formula—the PCF clears the
pending UI lock, ignores any later stale result, and displays a five-second
error dialog so the user can choose another seat or go Back. This timeout does
not replace the unique `BookingKey` constraint and does not apply to release or
confirmation actions.

To test simultaneous booking, open the published app as two authorized users,
select the same date and virtual seat, and reserve it from both sessions. One
request must create the unique booking. The other session may still show the
Power Apps/SharePoint error banner, but within 10 seconds its seat grid and Back
button must become usable and the PCF error dialog must appear.

The booking flow keeps date, floor, zone, and employees when returning from Seat Selection to edit. Leaving the flow to Home or starting Book Seat again clears the temporary selection, confirmed assignments, and preview action state.

New temporary seat reservations expire five minutes after each seat is selected. The Canvas formula stores the PCF-supplied `requestAssignment.expiresAt`; it must not replace that value with a separate hardcoded duration. The visible countdown uses the earliest active assignment in a bulk booking.

For one employee, clicking another available seat reserves the replacement before releasing the original seat. In bulk booking, click an assigned seat to mark that employee as the replacement target, then click the new seat. If the new reservation fails, the original remains selected. If releasing the original fails, the PCF attempts to release the new reservation and reports the failure. Clicking the active assigned seat again performs an explicit deselection. These operations reuse the existing `reserve` and `release` actions and do not require another Canvas action branch.

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

## Cancellation email flow

The `cancelGroup` action is only for confirmed bookings. It must never be used for
unconfirmed `Selected` reservations.

In `SeatMapControl1.OnChange`, add a separate `cancelGroup` branch after the
existing temporary-reservation action branches. The branch must:

1. Reject a request with more than five assignments.
2. For each request assignment, use its SharePoint `bookingId` to find the row.
3. Recheck that `Status` is `Booked` and `BookingDate >= Today()` before updating.
4. Change successful rows to `Cancelled` and change the unique BookingKey to
   `original-key|cancelled|SharePointID`.
5. Refresh `SeatBookings` once after the group finishes.
6. Return `action: "cancelGroup"`, the original `requestId`, and only the
   successfully cancelled records through `varSeatBookingActionResult`.
7. Call the cancellation-email flow with only those successful records.

Create a Power Apps (V2) flow named `SeatBookingCancellationEmail` with one
text input named `cancellationsJson`. Power Apps passes a JSON array of the
successful records; each item includes `bookingId`, `bookingKey`, `employeeId`,
`employeeName`, `bookingDate`, `seatNumber`, `floor`, and `zone`.

The flow must parse that array, then for each item get the SeatBookings row by
`bookingId`, read the Employee Person column email, and send one cancellation
email containing the employee name, booking date, seat, floor, and zone. The
flow does not change Booking Status or BookingKey; those updates remain in the
Power Apps formula. Do not call the flow for failed updates, temporary releases,
or expired reservations.

PCF deployment version `1.3.35` contains the Cancel Booking checkbox
multi-selection UI and the `cancelGroup` request. After importing this version,
update code components in the Canvas app before adding the matching OnChange
formula branch. No additional PCF property or dataset binding is required for
`cancelGroup`.
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

Set the `cancelBookingVisibleRecordCount` input from a Power Apps formula. It has no code default: a positive value sets the number of Cancel Booking rows visible before the list scrolls; leave it blank to avoid applying a row limit. Set it to `3` to keep approximately three records visible. Only the records scroll; the heading, filters, and Cancel button remain fixed inside the card. The Seat Selection screen always scrolls only its virtual-seat grid, so additional virtual seats do not increase the card height.

## Book Seat required fields

In the Book Seat screen, users must explicitly select both Floor and Zone before **View Available Seats** is enabled. Zone remains unavailable until a Floor is selected; no Floor, Zone, or `All Zones` value is preselected.

## Employee search keyboard controls

In the Book Seat employee search, use **Arrow Down** and **Arrow Up** to move through visible results, **Enter** to add the highlighted employee, and **Escape** to close the results.

## Booking date calendar

The Book Seat date calendar closes when the user selects a date, clicks/taps outside it, or moves keyboard focus to another control. My Bookings uses the same styled calendar for From and To dates, but keeps historical dates and weekends selectable. Clicking anywhere in either date field opens its calendar; selecting another control or clicking outside closes it. From and To date limits prevent an invalid range.

Clicking outside the Book Seat employee search—including Date, Floor, Zone, or another control—clears the typed search text and keyboard highlight and closes the suggestion list. Employees already selected are not removed.

The Book Seat Floor and Zone controls use rounded custom dropdowns that match
the employee search colors. They support Arrow Up/Down, Enter, Escape, Tab, and
outside-click closing. Employee selection remains blocked until the required
Floor and Zone values are selected. The selected-employee list keeps one row
visible and scrolls internally for additional employees so it does not grow the
main booking card.

## Login screen sizing

The login card centers within the size allocated to the PCF. Give the control
the full Canvas screen area:

```powerfx
X = 0
Y = 0
Width = Parent.Width
Height = Parent.Height
```

The login view scrolls only when its card cannot fit in the available height.

Cancel Booking resolves EmployeeName from the Employees dataset using the booking EmployeeCode; it displays the name and allows searches by either code or name.

## My Bookings history, access, and pagination

My Bookings is a read-only booking-history screen. It displays all booking
statuses and dates supplied to its dataset, then applies access scope before
user-facing filters:

- Employee: only their own booking history.
- Manager: their own history and their direct reporters' history.
- Practice Lead: only the Practice values assigned to them.
- HR: all booking history.

This browser-side scope improves the screen experience but is not a security
boundary. Configure SharePoint or Dataverse permissions and a server-filtered
`myBookingsDataSet_Items` formula so users are not sent unauthorized records.
Index SeatBookings `BookingDate`, `EmployeeId`, `Manager`, and `Practice`.

### Required history snapshots

Add the `Practice` Choice and `Manager` Person columns to SeatBookings and
populate them when each booking is reserved. Existing records must be
backfilled before historical manager or Practice filtering is complete.

The `Practice` choices must match the Employees Practice choices. The Manager
Person value should be the manager at booking time so later profile changes do
not rewrite history.

Add the existing `Practice` Choice column to Employees if it is not already
present. No TeamId or TeamName SharePoint columns are required; the PCF aliases
are internal mapping names.

### BookingAccess list

Create one access record per elevated assignment:

| Display name | Type | Values |
| --- | --- | --- |
| `User` | Person, single selection | the HR user or Practice Lead |
| `Role` | Choice | `HR` or `Practice Lead` |
| `Practice` | Choice | required for Practice Lead; blank for HR |

A Practice Lead with several practices needs one `BookingAccess` row for each
Practice. No access row is required for an employee or direct manager.

### PCF mappings

Map `myBookingsDataSet_Items` to the SeatBookings source that contains booking
history. Use these unique history aliases:

| PCF property | SharePoint internal name |
| --- | --- |
| `historyBookingId` | `ID` |
| `historyBookingDate` | `BookingDate` |
| `historyBookingEmployee` | `Employee` |
| `historyBookingEmployeeId` | `EmployeeId` |
| `historyBookingManager` | `Manager` Person column |
| `historyBookingPractice` | `Practice` Choice column |
| `historyBookingSeatKey` | `SeatKey` |
| `historyBookingSeatNumber` | `SeatNumber` |
| `historyBookingFloor` | `Floor` |
| `historyBookingZone` | `Zone` |
| `historyBookingStatus` | `Status` |
| `historyBookingKey` | `BookingKey` |

Map the remaining history property sets to the matching SeatBookings columns:
`historyBookingSeat`, `historyBookingCreatedBy`, and
`historyReservationExpiresAt`.

Map `bookingAccessDataSet_Items` to BookingAccess:

| PCF property | SharePoint internal name |
| --- | --- |
| `accessUser` | internal name of `User` |
| `accessRole` | internal name of `Role` |
| `accessTeamId` | internal name of `Practice` |

Set `myBookingsPageSize` to `10`. With no My Bookings filters active, the
screen displays only the latest 10 authorized records and intentionally hides
older pages. When any date, employee, team, or manager filter is active, the
same value becomes the page size and Previous/Next exposes all matching
authorized records. Leave the property blank only when all supplied results
should remain on one page.

The My Bookings header, filters, record heading, and pager stay inside the
fixed-height card. Only the current page's booking table scrolls vertically;
its column headings remain visible while scrolling. A value such as `5` is
recommended for compact Canvas layouts.

When creating a SeatBookings record, resolve the employee by EmpCode and write
`Manager` and `Practice` together with the existing EmployeeId snapshot.
