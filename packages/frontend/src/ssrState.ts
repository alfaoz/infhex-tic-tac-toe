import { useEffect, useState } from "react"

const kSsrRenderTimestamp = typeof window !== 'undefined' && typeof window.__IH3T_RENDERED_AT__ === 'number' ?
    window.__IH3T_RENDERED_AT__ : null;

let isHydrationRender_ = typeof window !== 'undefined'
    && typeof window.__IH3T_RENDERED_AT__ === 'number'
    && Boolean(document.getElementById('root')?.hasChildNodes())

export function useIsSsrRender() {
    const [status, setStatus] = useState<boolean>(isHydrationRender_ ? true : false);
    useEffect(() => setStatus(false), []);

    return status;
}

/** 
 * Returns Date.now() but with SSR render compatibility.
 * If the page has been rendered via SSR, it will return the SSR render timestamp 
 * for the first render to allow for hydration. Afterwards it will return the current date.
 * If the hydration render pass has already passed, Date.now() will be returned on the first render.
*/
export function useSsrCompatibleNow() {
    const isSsrRender = useIsSsrRender();
    return isSsrRender ? kSsrRenderTimestamp : Date.now();
}

export function getInitialRenderTimestamp() {
    if (typeof window !== 'undefined' && typeof window.__IH3T_RENDERED_AT__ === 'number') {
        return window.__IH3T_RENDERED_AT__
    }

    return Date.now()
}

export function getDehydratedStateFromWindow() {
    if (typeof window === 'undefined') {
        return undefined
    }

    return window.__IH3T_DEHYDRATED_STATE__
}

export function isHydrationRenderPass() {
    return isHydrationRender_
}

export function clearHydrationRenderPassFlag() {
    isHydrationRender_ = false
}
