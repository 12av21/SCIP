"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuth = exports.AuthProvider = void 0;
const react_1 = __importStar(require("react"));
const axios_1 = __importDefault(require("axios"));
const react_router_dom_1 = require("react-router-dom");
const react_hot_toast_1 = __importDefault(require("react-hot-toast"));
const AuthContext = (0, react_1.createContext)(undefined);
const AuthProvider = ({ children }) => {
    const [user, setUser] = (0, react_1.useState)(null);
    const [token, setToken] = (0, react_1.useState)(localStorage.getItem('scip_access_token'));
    const [loading, setLoading] = (0, react_1.useState)(true);
    const navigate = (0, react_router_dom_1.useNavigate)();
    (0, react_1.useEffect)(() => {
        const validateSession = async () => {
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                // Setup default header for subsequent requests
                axios_1.default.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                // In a real app, you'd call a /me or /validate endpoint
                // For now, we'll decode the JWT or use stored user data
                const storedUser = localStorage.getItem('scip_user_profile');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            }
            catch (error) {
                console.error("Session validation failed", error);
                logout();
            }
            finally {
                setLoading(false);
            }
        };
        validateSession();
    }, [token]);
    const login = (accessToken, refreshToken, userData) => {
        localStorage.setItem('scip_access_token', accessToken);
        localStorage.setItem('scip_refresh_token', refreshToken);
        localStorage.setItem('scip_user_profile', JSON.stringify(userData));
        setToken(accessToken);
        setUser(userData);
        axios_1.default.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    };
    const logout = () => {
        localStorage.removeItem('scip_access_token');
        localStorage.removeItem('scip_refresh_token');
        localStorage.removeItem('scip_user_profile');
        localStorage.removeItem('role'); // Legacy cleanup
        setToken(null);
        setUser(null);
        delete axios_1.default.defaults.headers.common['Authorization'];
        react_hot_toast_1.default.success("Logged out successfully");
        navigate('/login');
    };
    const value = {
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
        loading
    };
    return (<AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>);
};
exports.AuthProvider = AuthProvider;
const useAuth = () => {
    const context = (0, react_1.useContext)(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
exports.useAuth = useAuth;
exports.default = AuthContext;
