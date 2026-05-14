import {usePuterStore} from "~/lib/puter";
import {useEffect, useMemo} from "react";
import {useLocation, useNavigate} from "react-router";

export const meta = () => ([
    { title: 'CVision | Auth' },
    { name: 'description', content: 'Log into your account' },
])

const sanitizeNext = (raw: string | null): string => {
    if (!raw) return "/";
    let decoded: string;
    try {
        decoded = decodeURIComponent(raw);
    } catch {
        return "/";
    }
    // Only allow same-origin paths: must start with "/" and not "//" (which is protocol-relative)
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/";
    return decoded;
};

const Auth = () => {
    const { isLoading, auth } = usePuterStore();
    const location = useLocation();
    const navigate = useNavigate();

    const next = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return sanitizeNext(params.get("next"));
    }, [location.search]);

    useEffect(() => {
        if (auth.isAuthenticated) navigate(next);
    }, [auth.isAuthenticated, next]);

    return (
        <main className="bg-[url('/images/bg-auth.svg')] bg-cover min-h-screen flex items-center justify-center">
            <div className="gradient-border shadow-lg">
                <section className="flex flex-col gap-8 bg-white rounded-2xl p-10">
                    <div className="flex flex-col items-center gap-2 text-center">
                        <h1>Welcome</h1>
                        <h2>Log In to Continue Your Job Journey</h2>
                    </div>
                    <div>
                        {isLoading ? (
                            <button className="auth-button animate-pulse">
                                <p>Signing you in...</p>
                            </button>
                        ) : (
                            <>
                                {auth.isAuthenticated ? (
                                    <button className="auth-button" onClick={auth.signOut}>
                                        <p>Log Out</p>
                                    </button>
                                ) : (
                                    <button className="auth-button" onClick={auth.signIn}>
                                        <p>Log In</p>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </section>
            </div>
        </main>
    )
}

export default Auth
