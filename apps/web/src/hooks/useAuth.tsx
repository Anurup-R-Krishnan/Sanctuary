import React from "react";
import {
    useAuth as useClerkAuth,
    useUser as useClerkUser,
    SignIn as ClerkSignIn,
    SignUp as ClerkSignUp,
} from "@clerk/clerk-react";

const DISABLE_AUTH = import.meta.env.VITE_DISABLE_AUTH === "true";

const mockAuthState = {
    isLoaded: true,
    isSignedIn: true as const,
    userId: "guest",
    sessionId: "guest-session",
    getToken: async () => null as string | null,
    signOut: async () => { },
    orgId: null,
    orgRole: null,
    orgSlug: null,
    actor: null,
};

const mockUserState = {
    isLoaded: true,
    isSignedIn: true as const,
    user: {
        id: "guest",
        fullName: "Guest",
        firstName: "Guest",
        lastName: "",
        primaryEmailAddress: { emailAddress: "" },
        imageUrl: "",
    },
};

const authHookImpl: () => ReturnType<typeof useClerkAuth> | typeof mockAuthState = DISABLE_AUTH ? (() => mockAuthState) : useClerkAuth;
const userHookImpl: () => ReturnType<typeof useClerkUser> | typeof mockUserState = DISABLE_AUTH ? (() => mockUserState) : useClerkUser;

export function useAuth() {
    return authHookImpl();
}

export function useUser() {
    return userHookImpl();
}

type AuthComponentProps = Record<string, unknown>;

export const SignIn = (props: AuthComponentProps) => {
    if (DISABLE_AUTH) {
        return <div className="p-4 text-center text-sm opacity-60">Sign-in disabled in guest mode.</div>;
    }
    return <ClerkSignIn {...props} />;
};

export const SignUp = (props: AuthComponentProps) => {
    if (DISABLE_AUTH) {
        return <div className="p-4 text-center text-sm opacity-60">Sign-up disabled in guest mode.</div>;
    }
    return <ClerkSignUp {...props} />;
};
