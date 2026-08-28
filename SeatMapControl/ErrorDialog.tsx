import * as React from "react";


export interface IErrorDialogProps {
    message?: string;
    onDismiss: () => void;
}

export class ErrorDialog extends React.PureComponent<IErrorDialogProps> {
    private timer?: number;

    public componentDidMount(): void {
        this.scheduleDismissal();
    }

    public componentDidUpdate(previousProps: IErrorDialogProps): void {
        if (this.props.message !== previousProps.message) {
            this.clearDismissal();
            this.scheduleDismissal();
        }
    }

    public componentWillUnmount(): void {
        this.clearDismissal();
    }

    private scheduleDismissal(): void {
        if (this.props.message) {
            this.timer = window.setTimeout(this.props.onDismiss, 5000);
        }
    }

    private clearDismissal(): void {
        if (this.timer !== undefined) {
            window.clearTimeout(this.timer);
            this.timer = undefined;
        }
    }

    public render(): React.ReactNode {
        if (!this.props.message) {
            return null;
        }

        return (
            <div className="error-dialog-backdrop" role="presentation">
                <section
                    aria-labelledby="seat-booking-error-title"
                    aria-modal="true"
                    className="error-dialog"
                    role="alertdialog"
                >
                    <button
                        aria-label="Close error"
                        className="error-dialog-close"
                        type="button"
                        onClick={this.props.onDismiss}
                    >
                        ×
                    </button>
                    <h2 id="seat-booking-error-title">Something went wrong</h2>
                    <p>{this.props.message}</p>
                </section>
            </div>
        );
    }
}
