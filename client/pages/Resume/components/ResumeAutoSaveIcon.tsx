import React from "react";

type ResumeAutoSaveIconProps = React.SVGProps<SVGSVGElement>;

export const ResumeAutoSaveIcon: React.FC<ResumeAutoSaveIconProps> = ({
    className,
    ...props
}) => (
    <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
        {...props}
    >
        <path
            d="M18.7 7.9C17.32 5.98 14.98 4.8 12.25 4.8C8.28 4.8 5.02 7.68 4.42 11.45M4.42 11.45L3.45 8.96M4.42 11.45L6.91 10.48"
            stroke="currentColor"
            strokeWidth="1.15"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M10.05 14.05C9.28 14.05 8.65 13.42 8.65 12.65C8.65 11.96 9.16 11.38 9.83 11.28C10.05 10.34 10.89 9.65 11.9 9.65C12.75 9.65 13.48 10.13 13.84 10.84C14.68 10.89 15.34 11.58 15.34 12.43C15.34 13.32 14.61 14.05 13.72 14.05H10.05Z"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M5.3 16.1C6.68 18.02 9.02 19.2 11.75 19.2C15.72 19.2 18.98 16.32 19.58 12.55M19.58 12.55L20.55 15.04M19.58 12.55L17.09 13.52"
            stroke="currentColor"
            strokeWidth="1.15"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);
