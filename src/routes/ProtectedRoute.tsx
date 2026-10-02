import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center text-slate-400">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;
    return <Outlet />;
}

export default ProtectedRoute;
