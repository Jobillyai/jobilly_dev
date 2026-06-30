export const ROUTE_LOADING_START = "jobilly:route-loading-start";

export function startRouteLoading() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ROUTE_LOADING_START));
  }
}
