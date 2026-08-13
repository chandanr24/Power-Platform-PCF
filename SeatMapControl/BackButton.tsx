import * as React from "react";

interface IBackButtonProps {
    label: string;
    onClick: () => void;
}

export const BackButton: React.FC<IBackButtonProps> = ({
    label,
    onClick
}) => (
    <button
        className="back-button"
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
    >
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
        >
            <path
                d="M19 12H5M11 18L5 12L11 6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    </button>
);
