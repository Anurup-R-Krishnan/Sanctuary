import { createClient, Session } from "@supabase/supabase-js";

type GetToken = (options?: any) => Promise<string | null>;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    // Warn but don't crash, allowing functionality without sync
    console.warn('Missing Supabase environment variables. Sync features will be disabled.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);

export const createClerkSupabaseClient = async (getToken: GetToken) => {
    const token = await getToken({ template: 'supabase' });

    return createClient(
        supabaseUrl || 'https://placeholder.supabase.co',
        supabaseAnonKey || 'placeholder',
        {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        }
    );
};
