import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { App, IAppProps } from "./App";
import {
    IBookingActionRequest,
    parseActionResult
} from "./BookingModels";
import {
    parseBookingDataSet,
    parseBookingAccessDataSet,
    parseMyBookingsDataSet,
    parseEmployeeDataSet,
    parseSeatExceptionDataSet,
    parseSeatRangeDataSet
} from "./DatasetParsers";
import {
    previewEmployees,
    previewSeatExceptions,
    previewSeats
} from "./PreviewData";
import * as React from "react";

const DATA_SET_PAGE_SIZE = 500;

export class SeatMapControl implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private notifyOutputChanged: () => void;
    private actionRequestJson = "";
    private actionSequence = 0;
    private employeePagingInitialized = false;
    private seatRangePagingInitialized = false;
    private seatExceptionPagingInitialized = false;
    private bookingPagingInitialized = false;
    private myBookingsPagingInitialized = false;
    private bookingAccessPagingInitialized = false;

    /**
     * Empty constructor.
     */
    constructor() {
        // Empty
    }

    /**
     * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
     * Data-set values are not initialized here, use updateView.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
     * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
     * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
     */
    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary
    ): void {
        this.notifyOutputChanged = notifyOutputChanged;
        context.mode.trackContainerResize(true);
    }

    /**
     * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
     * @returns ReactElement root react element for the control
     */
    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        // TEMPORARY PREVIEW MODE: remove after all screens are approved.
        const previewMode = context.parameters.previewMode.raw ?? false;

        if (!previewMode) {
            this.bookingPagingInitialized = this.initializeDataSetPaging(
            context.parameters.seatBookingsDataSet,
            this.bookingPagingInitialized
            );
            this.myBookingsPagingInitialized = this.initializeDataSetPaging(
                context.parameters.myBookingsDataSet,
                this.myBookingsPagingInitialized
            );
            this.bookingAccessPagingInitialized = this.initializeDataSetPaging(
                context.parameters.bookingAccessDataSet,
                this.bookingAccessPagingInitialized
            );
            this.employeePagingInitialized = this.initializeDataSetPaging(
                context.parameters.employeesDataSet,
                this.employeePagingInitialized
            );
            this.seatRangePagingInitialized = this.initializeDataSetPaging(
                context.parameters.seatRangesDataSet,
                this.seatRangePagingInitialized
            );
            this.seatExceptionPagingInitialized = this.initializeDataSetPaging(
                context.parameters.seatExceptionsDataSet,
                this.seatExceptionPagingInitialized
            );
        }

        const seatBookings = parseBookingDataSet(
        context.parameters.seatBookingsDataSet
        );

        const configuredMaximumPeople =
        context.parameters.maximumPeoplePerBooking.raw;
        const maximumPeoplePerBooking =
        typeof configuredMaximumPeople === "number" &&
        Number.isFinite(configuredMaximumPeople) &&
        configuredMaximumPeople > 0
        ? Math.trunc(configuredMaximumPeople)
        : 30;

        const props: IAppProps = {
            actionResult: parseActionResult(
                context.parameters.actionResultJson.raw
            ),
            allocatedHeight: context.mode.allocatedHeight,
            allocatedWidth: context.mode.allocatedWidth,
            bookingAccess: previewMode ? [] : parseBookingAccessDataSet(context.parameters.bookingAccessDataSet),
            bookings: seatBookings,
            myBookings: previewMode ? seatBookings : parseMyBookingsDataSet(context.parameters.myBookingsDataSet),
            myBookingsPageSize: context.parameters.myBookingsPageSize.raw ?? undefined,
            employees: previewMode
                ? previewEmployees
                : parseEmployeeDataSet(context.parameters.employeesDataSet),
            exceptions: previewMode
                ? previewSeatExceptions
                : parseSeatExceptionDataSet(
                      context.parameters.seatExceptionsDataSet
                  ),
            canBookForAnyone:
                previewMode ||
                (context.parameters.canBookForAnyone.raw ?? false),
            cancelBookingVisibleRecordCount:
                context.parameters.cancelBookingVisibleRecordCount.raw ?? undefined,
            canCreateBookings:
                previewMode ||
                (context.parameters.canCreateBookings.raw ?? false),
            currentUserEmail:
                previewMode
                    ? "manager@example.com"
                    : context.parameters.currentUserEmail.raw ?? "",
            maximumPeoplePerBooking,
            onActionRequest: this.handleActionRequest,
            previewMode,
            seats: previewMode
                ? previewSeats
                : parseSeatRangeDataSet(
                      context.parameters.seatRangesDataSet
                  )
        };
        return React.createElement(
            App, props
        );
    }

    /**
     * It is called by the framework prior to a control receiving new data.
     * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as "bound" or "output"
     */
    public getOutputs(): IOutputs {
        return {
            actionRequestJson: this.actionRequestJson,
            actionSequence: this.actionSequence
        };
    }

    /**
     * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
     * i.e. cancelling any pending remote calls, removing listeners, etc.
     */
    public destroy(): void {
        // Add code to cleanup control if necessary
    }

    private readonly handleActionRequest = (
        request: IBookingActionRequest
    ): void => {
        this.actionRequestJson = JSON.stringify(request);
        this.actionSequence += 1;
        this.notifyOutputChanged();
    };

    private initializeDataSetPaging(
        dataSet: ComponentFramework.PropertyTypes.DataSet,
        initialized: boolean
    ): boolean {
        if (initialized || dataSet.loading) {
            return initialized;
        }

        if (dataSet.paging.pageSize !== DATA_SET_PAGE_SIZE) {
            dataSet.paging.setPageSize(DATA_SET_PAGE_SIZE);
            dataSet.refresh();
            return false;
        }

        if (dataSet.paging.hasNextPage) {
            dataSet.paging.loadNextPage();
            return false;
        }

        return true;
    }
}
