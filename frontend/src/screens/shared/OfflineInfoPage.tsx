import { ArrowLeft, RefreshCw, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { useNetworkStatus } from "../../context/NetworkStatusContext";

export default function OfflineInfoPage() {
  const navigate = useNavigate();
  const { checking, refreshConnectivity } = useNetworkStatus();

  return (
    <div className="role-theme-page min-h-screen px-4 py-24 text-[var(--app-text)] sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Card className="theme-card">
          <CardContent className="p-6 text-center sm:p-8">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/15 text-amber-300">
              <WifiOff className="h-8 w-8" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold">
              Internet access is required
            </h1>
            <p className="mt-3 text-sm leading-6 theme-muted">
              You can keep reading content that was already loaded, but this page
              needs a fresh server connection or cached data that is not available
              yet.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button onClick={() => void refreshConnectivity()} disabled={checking}>
                <RefreshCw className={["mr-2 h-4 w-4", checking ? "animate-spin" : ""].join(" ")} />
                Check Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
