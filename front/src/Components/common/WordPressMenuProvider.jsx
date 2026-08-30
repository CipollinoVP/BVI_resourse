import React, {
    createContext,
    useCallback,
    useContext,
    useState,
    useEffect,
    useRef
} from 'react';

import { cn, decodeHtmlEntities } from "./utils";

const createMenuItem = (data) => {
    return {
        id: String(data.id),
        // WordPress stores titles HTML-encoded: an ampersand comes back as
        // "&#038;", an apostrophe as "&#039;". React renders strings as text,
        // so without decoding the entity itself is what the visitor reads.
        label: decodeHtmlEntities(String(data.title)),
        href: data.resolved_url,
        children: Array.isArray(data.children)
            ? data.children.map(createMenuItem)
            : undefined
    };
};

// Create context
const MenuContext = createContext(null);

// Custom hook to use menu context
const useMenu = () => {
    const context = useContext(MenuContext);
    if (!context) {
        throw new Error('useMenu must be used within a MenuProvider');
    }
    return context;
};

// MenuProvider component
const WordpressMenuProvider = ({ children, menu_id, ...divProps }) => {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isRefetching, setIsRefetching] = useState(false);
    const abortControllerRef = useRef(null);

    const handleError = useCallback(() => {
        const message = 'Failed to fetch menu items';
        setError(message);
    }, []);

    const fetchMenuItems = async (signal) => {
        // Prevent race conditions
        if (isRefetching) return;

        setLoading(true);
        setIsRefetching(true);
        setError(null);

        try {
            const data = await wvcClient.getMenuItems({ menuId: parseInt(menu_id) });
            const menuItems = data.map(createMenuItem);
            setMenuItems(menuItems);
        } catch {
            handleError();
        } finally {
            setLoading(false);
            setIsRefetching(false);
        }
    };

    useEffect(() => {
        // Create new AbortController for this request
        abortControllerRef.current = new AbortController();

        fetchMenuItems(abortControllerRef.current.signal);

        // Setup event listener for external refresh events
        const handleMenuRefresh = () => {
            refetch();
        };
        //if (typeof window === 'undefined') return

        window.addEventListener("WVC_MENU_REFRESH", handleMenuRefresh);

        // Cleanup function
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            window.removeEventListener("WVC_MENU_REFRESH", handleMenuRefresh);
        };
    }, []);

    const refetch = async () => {
        // Create new AbortController for refetch
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        await fetchMenuItems(abortControllerRef.current.signal);
    };

    const value = {
        menuItems,
        loading,
        error,
        refetch,
        isRefetching
    };

    return (
        <MenuContext.Provider value={value}>
            <div
                {...divProps}
                data-wvc-dynamic="MenuProvider"
                data-wvc-menu_id={menu_id}
            >
                {children}
            </div>
        </MenuContext.Provider>
    );
};

export const MenuProvider = WordpressMenuProvider;
export { WordpressMenuProvider, useMenu };