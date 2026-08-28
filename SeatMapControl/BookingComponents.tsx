import * as React from "react";

import ChevronIcon from "./assets/booking/chevron.svg";
import StepCheckIcon from "./assets/booking/step-check.svg";

interface IBookingProgressProps {
    activeStep: 1 | 2 | 3;
}

interface IBookingDropdownProps {
    disabled?: boolean;
    id: string;
    invalid?: boolean;
    onChange: (value: string) => void;
    options: string[];
    placeholder: string;
    value: string;
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

export const BookingDropdown: React.FC<IBookingDropdownProps> = ({
    disabled,
    id,
    invalid,
    onChange,
    options,
    placeholder,
    value
}) => {
    const [activeIndex, setActiveIndex] = React.useState(-1);
    const [open, setOpen] = React.useState(false);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const items = React.useMemo(
        () => [
            { label: placeholder, value: "" },
            ...options.map((option) => ({ label: option, value: option }))
        ],
        [options, placeholder]
    );

    React.useEffect(() => {
        if (!open) {
            return undefined;
        }

        const closeWhenOutside = (event: Event): void => {
            const target = event.target;

            if (target instanceof Node && !rootRef.current?.contains(target)) {
                setOpen(false);
                setActiveIndex(-1);
            }
        };

        document.addEventListener("pointerdown", closeWhenOutside);
        document.addEventListener("focusin", closeWhenOutside);

        return () => {
            document.removeEventListener("pointerdown", closeWhenOutside);
            document.removeEventListener("focusin", closeWhenOutside);
        };
    }, [open]);

    const openMenu = (): void => {
        if (disabled) {
            return;
        }

        const selectedIndex = items.findIndex((item) => item.value === value);
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
        setOpen(true);
    };

    const closeMenu = (): void => {
        setOpen(false);
        setActiveIndex(-1);
    };

    const selectItem = (index: number): void => {
        const item = items[index];

        if (!item) {
            return;
        }

        onChange(item.value);
        closeMenu();
    };

    const handleKeyDown = (
        event: React.KeyboardEvent<HTMLButtonElement>
    ): void => {
        if (disabled) {
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) {
                openMenu();
            } else {
                setActiveIndex((index) =>
                    Math.min(index + 1, items.length - 1)
                );
            }
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) {
                setActiveIndex(items.length - 1);
                setOpen(true);
            } else {
                setActiveIndex((index) => Math.max(index - 1, 0));
            }
            return;
        }

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (open && activeIndex >= 0) {
                selectItem(activeIndex);
            } else {
                openMenu();
            }
            return;
        }

        if (event.key === "Escape" && open) {
            event.preventDefault();
            closeMenu();
        }
    };

    return (
        <div className="booking-dropdown" ref={rootRef}>
            <button
                aria-activedescendant={
                    open && activeIndex >= 0
                        ? `${id}-option-${activeIndex}`
                        : undefined
                }
                aria-controls={`${id}-options`}
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-invalid={invalid}
                className="booking-dropdown-trigger"
                disabled={disabled}
                id={id}
                role="combobox"
                type="button"
                onClick={() => (open ? closeMenu() : openMenu())}
                onKeyDown={handleKeyDown}
            >
                <span>{value || placeholder}</span>
                <ChevronIcon aria-hidden="true" focusable="false" />
            </button>
            {open ? (
                <ul
                    className="booking-dropdown-menu"
                    id={`${id}-options`}
                    role="listbox"
                >
                    {items.map((item, index) => (
                        <li key={item.value || "placeholder"} role="none">
                            <button
                                aria-selected={item.value === value}
                                className={
                                    index === activeIndex
                                        ? "booking-dropdown-option booking-dropdown-option--active"
                                        : "booking-dropdown-option"
                                }
                                id={`${id}-option-${index}`}
                                role="option"
                                tabIndex={-1}
                                type="button"
                                onClick={() => selectItem(index)}
                                onMouseEnter={() => setActiveIndex(index)}
                            >
                                {item.label}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
};

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
