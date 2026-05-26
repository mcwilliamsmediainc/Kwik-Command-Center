import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/Layout";
import { ProfileProvider } from "@/context/ProfileContext";

// Pages
import { Dashboard } from "@/pages/Dashboard";
import { RyderPage } from "@/pages/agents/RyderPage";
import { DispatchPage } from "@/pages/agents/DispatchPage";
import { LedgerPage } from "@/pages/agents/LedgerPage";
import { ScoutPage } from "@/pages/agents/ScoutPage";
import { SagePage } from "@/pages/agents/SagePage";
import { BlazePage } from "@/pages/agents/BlazePage";
import { InboxPage } from "@/pages/InboxPage";
import { AskPage } from "@/pages/intelligence/AskPage";
import { CustomersPage } from "@/pages/intelligence/CustomersPage";
import { ReactivationPage } from "@/pages/intelligence/ReactivationPage";
import { JobPipelinePage } from "@/pages/operations/JobPipelinePage";
import { TeamPayPage } from "@/pages/operations/TeamPayPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { DemoModePage } from "@/pages/DemoModePage";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/agents/ryder" component={RyderPage} />
        <Route path="/agents/dispatch" component={DispatchPage} />
        <Route path="/agents/ledger" component={LedgerPage} />
        <Route path="/agents/scout" component={ScoutPage} />
        <Route path="/agents/sage"  component={SagePage} />
        <Route path="/agents/blaze" component={BlazePage} />
        <Route path="/inbox" component={InboxPage} />
        <Route path="/intelligence/ask" component={AskPage} />
        <Route path="/intelligence/customers" component={CustomersPage} />
        <Route path="/intelligence/reactivation" component={ReactivationPage} />
        <Route path="/operations/jobs" component={JobPipelinePage} />
        <Route path="/operations/team" component={TeamPayPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/demo" component={DemoModePage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProfileProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ProfileProvider>
    </QueryClientProvider>
  );
}

export default App;
