// A1 Marine Storage — App Router
// Style: Contemporary Coastal Modernism — dark harbor, red accents
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import { trackPageView } from "./lib/analytics";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Pricing from "./pages/Pricing";
import Calculator from "./pages/Calculator";
import Facility from "./pages/Facility";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";

function Router() {
  // SPA route tracking: wouter doesn't fire page_view on navigation, so do it here
  // on every location change (fires the initial view on mount too).
  const [location] = useLocation();
  useEffect(() => {
    trackPageView(location);
  }, [location]);

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/services" component={Services} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/calculator" component={Calculator} />
      <Route path="/facility" component={Facility} />
      <Route path="/contact" component={Contact} />
      <Route path="/privacy" component={Privacy} />
      {/* /terms is a server-side 301 to a1marine.ca/terms — no client route. */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <div className="min-h-screen flex flex-col bg-[oklch(0.12_0.018_240)]">
            <SiteHeader />
            <main className="flex-1">
              <Router />
            </main>
            <SiteFooter />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
