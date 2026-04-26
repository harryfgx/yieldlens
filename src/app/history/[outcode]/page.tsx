import { api } from "~/trpc/server";
import { HistoryClient } from "./history-client";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ outcode: string }>;
}) {
  const { outcode } = await params;
  const oc = outcode.toUpperCase();

  const [drilldown, findings] = await Promise.all([
    api.analytics.historicalDrilldown({ outcode: oc }),
    api.analytics.historicalFindings({ outcode: oc }).catch(() => []),
  ]);

  return <HistoryClient outcode={oc} drilldown={drilldown} findings={findings} />;
}
