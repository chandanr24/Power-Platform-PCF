import * as React from "react";

import AvanadeLogo from "./assets/avanade-logo.svg";
import EntraSecurityIcon from "./assets/entra-security.svg";
import MicrosoftLogo from "./assets/microsoft-logo.svg";

export interface ILoginScreenProps {
    allocatedHeight: number;
    allocatedWidth: number;
    currentUserEmail: string;
    onSignIn?: () => void;
}

interface IMicrosoftSignInButtonProps {
    disabled: boolean;
    onSignIn?: () => void;
}

const LoginHeader: React.FC = () => (
    <header className="login-header">
        <AvanadeLogo
            className="login-brand"
            role="img"
            aria-label="Avanade"
            preserveAspectRatio="xMidYMid meet"
        />
        <h1 id="login-title" className="login-title">
            Office Seat &amp;
            <br />
            Meeting Room Booking
            <br />
            System
        </h1>
        <p className="login-instructions">
            Sign in with your organizational account
        </p>
    </header>
);

const MicrosoftSignInButton: React.FC<IMicrosoftSignInButtonProps> = ({
    disabled,
    onSignIn
}) => (
    <button
        className="microsoft-sign-in"
        type="button"
        disabled={disabled}
        onClick={onSignIn}
    >
        <MicrosoftLogo aria-hidden="true" focusable="false" />
        <span>Sign in with Microsoft</span>
    </button>
);

const SecurityFooter: React.FC = () => (
    <footer className="login-security">
        <EntraSecurityIcon aria-hidden="true" focusable="false" />
        <span>Secured by Microsoft Entra ID</span>
    </footer>
);

export class LoginScreen extends React.PureComponent<ILoginScreenProps> {
    public render(): React.ReactNode {
        const { allocatedHeight, allocatedWidth, currentUserEmail } = this.props;
        const hasSsoIdentity = currentUserEmail.trim().length > 0;
        const layoutClasses = ["login-control"];

        if (allocatedWidth > 0 && allocatedWidth <= 480) {
            layoutClasses.push("login-control--mobile");
        } else if (allocatedWidth > 0 && allocatedWidth <= 820) {
            layoutClasses.push("login-control--tablet");
        } else if (allocatedWidth > 0 && allocatedWidth <= 1180) {
            layoutClasses.push("login-control--compact");
        }

        if (
            allocatedHeight > 0 &&
            allocatedHeight <= 640 &&
            allocatedWidth > 480
        ) {
            layoutClasses.push("login-control--short");
        }

        return (
            <div className={layoutClasses.join(" ")}>
                <main className="login-screen" aria-labelledby="login-title">
                    <section className="login-card">
                        <LoginHeader />
                        <MicrosoftSignInButton
                            disabled={!hasSsoIdentity}
                            onSignIn={this.props.onSignIn}
                        />
                        {!hasSsoIdentity && (
                            <p className="login-error" role="alert">
                                We could not identify your Microsoft account.
                                Refresh the app or contact support.
                            </p>
                        )}
                        <SecurityFooter />
                    </section>
                </main>
            </div>
        );
    }
}
