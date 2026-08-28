import * as React from "react";

import SearchIcon from "./assets/booking/search.svg";
import { IEmployee } from "./BookingModels";
import { CancelIcon } from "./CancelIcon";
import { ErrorDialog } from "./ErrorDialog";

interface IEmployeeMultiSelectProps {
    employees: IEmployee[];
    maximum: number;
    onChange: (employees: IEmployee[]) => void;
    selectionBlockedMessage?: string;
    selectedEmployees: IEmployee[];
}

interface IEmployeeMultiSelectState {
    activeResultIndex: number;
    duplicateError?: string;
    query: string;
}

export class EmployeeMultiSelect extends React.PureComponent<
    IEmployeeMultiSelectProps,
    IEmployeeMultiSelectState
> {
    public state: IEmployeeMultiSelectState = {
        activeResultIndex: -1,
        query: ""
    };

    private readonly rootRef = React.createRef<HTMLElement>();

    public componentDidMount(): void {
        document.addEventListener("pointerdown", this.clearSearchWhenOutside);
        document.addEventListener("focusin", this.clearSearchWhenOutside);
    }

    public componentWillUnmount(): void {
        document.removeEventListener("pointerdown", this.clearSearchWhenOutside);
        document.removeEventListener("focusin", this.clearSearchWhenOutside);
    }

    private readonly clearSearchWhenOutside = (event: Event): void => {
        const target = event.target;

        if (target instanceof Node && !this.rootRef.current?.contains(target)) {
            this.setState((state) =>
                state.query || state.activeResultIndex >= 0
                    ? { activeResultIndex: -1, query: "" }
                    : null
            );
        }
    };

    private getResults(): IEmployee[] {
        const query = this.state.query.trim().toLowerCase();

        return query
    ? this.props.employees
          .filter((employee) =>
              [employee.name, employee.employeeId]
                  .join(" ")
                  .toLowerCase()
                  .includes(query)
          )
          .slice(0, 8)
    : [];
    }

    private readonly addEmployee = (employee: IEmployee): void => {
        if (this.props.selectionBlockedMessage) {
            this.setState({
                activeResultIndex: -1,
                duplicateError: this.props.selectionBlockedMessage
            });
            return;
        }

        const employeeIdentity =
            employee.employeeId.trim().toLowerCase() ||
            employee.email.trim().toLowerCase();
        const duplicate = this.props.selectedEmployees.some(
            (selected) =>
                (selected.employeeId.trim().toLowerCase() ||
                    selected.email.trim().toLowerCase()) === employeeIdentity
        );

        if (duplicate) {
            this.setState({
                activeResultIndex: -1,
                duplicateError: `${employee.name} is already selected.`
            });
            return;
        }

        if (this.props.selectedEmployees.length >= this.props.maximum) {
            this.setState({
                activeResultIndex: -1,
                duplicateError: `You can select up to ${this.props.maximum} employees for the current availability.`
            });
            return;
        }

        this.props.onChange([...this.props.selectedEmployees, employee]);
        this.setState({
            activeResultIndex: -1,
            duplicateError: undefined,
            query: ""
        });
    };

    private readonly handleSearchKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>
    ): void => {
        const results = this.getResults();

        if (event.key === "Escape") {
            event.preventDefault();
            this.setState({ activeResultIndex: -1, query: "" });
            return;
        }

        if (results.length === 0) {
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            this.setState((state) => ({
                activeResultIndex: Math.min(
                    state.activeResultIndex + 1,
                    results.length - 1
                )
            }));
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            this.setState((state) => ({
                activeResultIndex:
                    state.activeResultIndex <= 0
                        ? 0
                        : state.activeResultIndex - 1
            }));
            return;
        }

        if (event.key === "Enter" && this.state.activeResultIndex >= 0) {
            event.preventDefault();
            this.addEmployee(results[this.state.activeResultIndex]);
        }
    };

    private readonly removeEmployee = (employeeId: string): void => {
        this.props.onChange(
            this.props.selectedEmployees.filter(
                (employee) => employee.employeeId !== employeeId
            )
        );
        this.setState({ duplicateError: undefined });
    };

    public render(): React.ReactNode {
    const results = this.getResults();
    const query = this.state.query.trim();
    const activeResult = results[this.state.activeResultIndex];

    return (
            <section className="employee-combo" aria-labelledby="employee-combo-label" ref={this.rootRef}>
                <div className="employee-selection-heading">
                    <h2 id="employee-combo-label">Select Employees</h2>
                    <span>
                        {this.props.selectedEmployees.length} / {this.props.maximum}
                    </span>
                </div>
                <div className="employee-search-wrapper">
                    <input
                        aria-activedescendant={
                            activeResult
                                ? `employee-result-${activeResult.employeeId}`
                                : undefined
                        }
                        aria-autocomplete="list"
                        aria-controls="employee-search-results"
                        aria-expanded={results.length > 0}
                        placeholder="Search employee name or code"
                        role="combobox"
                        type="search"
                        value={this.state.query}
                        onChange={(event) =>
                            this.setState({
                                activeResultIndex: -1,
                                duplicateError: undefined,
                                query: event.currentTarget.value
                            })
                        }
                        onKeyDown={this.handleSearchKeyDown}
                    />
                    <SearchIcon aria-hidden="true" focusable="false" />
                </div>
                {query ? (
                    <ul
                        className="employee-search-results"
                        id="employee-search-results"
                        role="listbox"
                    >
                        {results.length ? (
                            results.map((employee, index) => (
                                <li key={employee.employeeId} role="none">
                                    <button
                                        aria-selected={index === this.state.activeResultIndex}
                                        className={
                                            index === this.state.activeResultIndex
                                                ? "employee-search-result--active"
                                                : undefined
                                        }
                                        id={`employee-result-${employee.employeeId}`}
                                        role="option"
                                        type="button"
                                        onClick={() => this.addEmployee(employee)}
                                    >
                                        <span>{employee.name}</span>
                                        <small>{employee.employeeId}</small>
                                    </button>
                                </li>
                            ))
                        ) : (
                            <li className="employee-no-results" role="option">
                                No matching employees
                            </li>
                        )}
                    </ul>
                ) : null}
                {this.props.employees.length === 0 ? (
                    <p className="employee-data-empty" role="status">
                        No employees are available. Check the EmployeeList dataset
                        mapping and booking permissions.
                    </p>
                ) : null}
                {this.props.selectedEmployees.length ? (
                    <ul className="selected-employee-list">
                        {this.props.selectedEmployees.map((employee) => (
                            <li key={employee.employeeId}>
                                <span>
                                    {employee.name}
                                    <small>{employee.employeeId}</small>
                                </span>
                                <button
                                    type="button"
                                    aria-label={`Remove ${employee.name}`}
                                    title={`Remove ${employee.name}`}
                                    onClick={() => this.removeEmployee(employee.employeeId)}
                                >
                                    <CancelIcon aria-hidden="true" focusable="false" />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="employee-selection-empty">
                        Search and select at least one employee.
                    </p>
                )}
                <ErrorDialog
                    message={this.state.duplicateError}
                    onDismiss={() => this.setState({ duplicateError: undefined })}
                />
            </section>
        );
    }
}