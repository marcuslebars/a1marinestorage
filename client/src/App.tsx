// A1 Marine Storage — App Router
// Style: Contemporary Coastal Modernism — dark harbor, cyan accents
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Pricing from "./pages/Pricing";
import Calculator from "./pages/Calculator";
import Facility from "./pages/Facility";
import Contact from "./pages/Contact";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/services" component={Services} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/calculator" component={Calculator} />
      <Route path="/facility" component={Facility} />
      <Route path="/contact" component={Contact} />
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
