import { Outlet, useLocation, useNavigate } from "react-router";
import { useEffect } from "react";
import { usePuterStore } from "~/lib/puter";

export default function Protected() {
    const { auth, isLoading } = usePuterStore();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) {
            const next = `${location.pathname}${location.search}`;
            navigate(`/auth?next=${next}`);
        }
    }, [isLoading, auth.isAuthenticated, location.pathname, location.search]);

    if (isLoading || !auth.isAuthenticated) return null;
    return <Outlet />;
}
