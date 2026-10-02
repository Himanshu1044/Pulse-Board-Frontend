import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode
} from "react";
import { getCurrentUser, login as loginUser } from "../services/authService";
import { closeSocket } from "../lib/socket";

type User = {
    id: string;
    name: string;
    email: string;
    email_verified: boolean;
    created_at: string;
};

type AuthContextType = {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        localStorage.removeItem("token");
        closeSocket();
        setUser(null);
    }, []);

    useEffect(() => {
        const loadUser = async () => {
            if (!localStorage.getItem("token")) {
                setLoading(false);
                return;
            }
            try {
                const data = await getCurrentUser();
                setUser(data.user);
            } catch {
                localStorage.removeItem("token");
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        loadUser();
    }, []);

    // The API client fires this when a token expires
    useEffect(() => {
        window.addEventListener("pb:logout", logout);
        return () => window.removeEventListener("pb:logout", logout);
    }, [logout]);

    const login = async (email: string, password: string) => {
        const data = await loginUser(email, password);
        localStorage.setItem("token", data.token);
        setUser(data.user);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside AuthProvider");
    return context;
}
