import * as React from "react";

import StepCheckIcon from "./assets/booking/step-check.svg";

interface IBookingProgressProps {
    activeStep: 1 | 2 | 3;
}

interface IFormFieldProps {
    children: React.ReactNode;
    error?: string;
    htmlFor: string;
    label: string;
}

interface IPrimaryButtonProps {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: "button" | "submit";
}

const steps = ["Select Date & Filters", "Choose Seat", "Confirm"];

export const BookingProgress: React.FC<IBookingProgressProps> = ({
    activeStep
}) => (
    <ol className="booking-progress" aria-label="Booking progress">
        {steps.map((label, index) => {
            const stepNumber = index + 1;
            const active = stepNumber === activeStep;
            const complete = stepNumber < activeStep || active;

            return (
                <React.Fragment key={label}>
                    <li className={active ? "booking-step booking-step--active" : "booking-step"}>
                        <span className="booking-step-number">
                            {complete && active ? (
                                <StepCheckIcon aria-hidden="true" focusable="false" />
                            ) : (
                                stepNumber
                            )}
                        </span>
                        <span>{label}</span>
                    </li>
                    {stepNumber < steps.length ? (
                        <li className="booking-step-divider" aria-hidden="true" />
                    ) : null}
                </React.Fragment>
            );
        })}
    </ol>
);

export const FormField: React.FC<IFormFieldProps> = ({
    children,
    error,
    htmlFor,
    label
}) => (
    <div className="booking-field">
        <label htmlFor={htmlFor}>{label}</label>
        {children}
        {error ? (
            <span className="booking-field-error" id={`${htmlFor}-error`} role="alert">
                {error}
            </span>
        ) : null}
    </div>
);

export const PrimaryButton: React.FC<IPrimaryButtonProps> = ({
    children,
    disabled,
    onClick,
    type = "button"
}) => (
    <button
        className="booking-primary-button"
        disabled={disabled}
        type={type}
        onClick={onClick}
    >
        {children}
    </button>
);
