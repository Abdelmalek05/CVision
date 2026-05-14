import { useState } from "react";
import { Link } from "react-router";
import { usePuterStore } from "~/lib/puter";
import ConfirmDialog from "~/components/ConfirmDialog";

const logoutIcon = (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6 text-red-600"
        aria-hidden="true"
    >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

const Navbar = () => {
    const { auth } = usePuterStore();
    const [confirmingLogout, setConfirmingLogout] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleConfirmLogout = async () => {
        setIsLoggingOut(true);
        try {
            await auth.signOut();
        } finally {
            setIsLoggingOut(false);
            setConfirmingLogout(false);
        }
    };

    return (
        <nav className="navbar">
            <Link to="/">
                <p className="text-2xl font-bold text-gradient">RESUMIND</p>
            </Link>
            <div className="flex items-center gap-3">
                <Link to="/upload" className="primary-button w-fit">
                    Upload Resume
                </Link>
                {auth.isAuthenticated && (
                    <button
                        type="button"
                        onClick={() => setConfirmingLogout(true)}
                        className="bg-gradient-to-b from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white rounded-full px-4 py-2 cursor-pointer transition w-fit"
                    >
                        Log Out
                    </button>
                )}
            </div>

            <ConfirmDialog
                open={confirmingLogout}
                title="Log out?"
                message="You'll need to sign in again to access your resumes."
                confirmLabel="Log Out"
                processingLabel="Logging out..."
                isProcessing={isLoggingOut}
                icon={logoutIcon}
                onConfirm={handleConfirmLogout}
                onCancel={() => setConfirmingLogout(false)}
            />
        </nav>
    );
};

export default Navbar;
