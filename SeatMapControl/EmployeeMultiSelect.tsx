import * as React from "react";

import SearchIcon from "./assets/booking/search.svg";
import { IEmployee } from "./BookingModels";
import { CancelIcon } from "./CancelIcon";

interface IEmployeeMultiSelectProps {
    employees: IEmployee[];
    maximum: number;
    onChange: (employees: IEmployee[]) => void;
    selectedEmployees: IEmployee[];
}

interface IEmployeeMultiSelectState {
    duplicateError?: string;
    query: string;
}

export class EmployeeMultiSelect extends React.PureComponent<
    IEmployeeMultiSelectProps,
    IEmployeeMultiSelectState
> {
    public state: IEmployeeMultiSelectState = { query: "" };

    private readonly addEmployee = (employee: IEmployee): void => {
        const normalizedEmail = employee.email.trim().toLowerCase();
        const duplicate = this.props.selectedEmployees.some(
            (selected) =>
                selected.email.trim().toLowerCase() === normalizedEmail
        );

        if (duplicate) {
            this.setState({
                duplicateError: `${employee.name} is already selected.`
            });
            return;
        }

        if (this.props.selectedEmployees.length >= this.props.maximum) {
            this.setState({
                duplicateError: `You can select up to ${this.props.maximum} employees for the current availability.`
            });
            return;
        }

        this.props.onChange([...this.props.selectedEmployees, employee]);
        this.setState({ duplicateError: undefined, query: "" });
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
        const query = this.state.query.trim().toLowerCase();
        const results = query
            ? this.props.employees
                  .filter((employee) =>
                      [employee.name, employee.email, employee.employeeId]
                          .join(" ")
                          .toLowerCase()
                          .includes(query)
                  )
                  .slice(0, 8)
            : [];

        return (
            <section className="employee-combo" aria-labelledby="employee-combo-label">
                <div className="employee-selection-heading">
                    <h2 id="employee-combo-label">Select Employees</h2>
                    <span>
                        {this.props.selectedEmployees.length} / {this.props.maximum}
                    </span>
                </div>
                <div className="employee-search-wrapper">
                    <input
                        aria-controls="employee-search-results"
                        aria-expanded={results.length > 0}
                        placeholder="Search name, ID, or email"
                        type="search"
                        value={this.state.query}
                        onChange={(event) =>
                            this.setState({
                                duplicateError: undefined,
                                query: event.currentTarget.value
                            })
                        }
                    />
                    <SearchIcon aria-hidden="true" focusable="false" />
                </div>
                {query ? (
                    <ul className="employee-search-results" id="employee-search-results">
                        {results.length ? (
                            results.map((employee) => (
                                <li key={employee.employeeId}>
                                    <button
                                        type="button"
                                        onClick={() => this.addEmployee(employee)}
                                    >
                                        <span>{employee.name}</span>
                                        <small>{employee.employeeId}</small>
                                    </button>
                                </li>
                            ))
                        ) : (
                            <li className="employee-no-results">
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
                {this.state.duplicateError ? (
                    <p className="booking-field-error" role="alert">
                        {this.state.duplicateError}
                    </p>
                ) : null}
            </section>
        );
    }
}
