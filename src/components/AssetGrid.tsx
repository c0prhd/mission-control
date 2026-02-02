interface Asset {
  symbol: string;
  frequency: string;
  gapRatio: number;
  status: string;
  lastUpdate: number;
  rank?: number;
}

interface AssetGridProps {
  assets: Asset[];
}

export default function AssetGrid({ assets }: AssetGridProps) {
  if (assets.length === 0) {
    return (
      <div className="empty-state">
        <div className="emoji">📊</div>
        <p>No asset data yet</p>
      </div>
    );
  }

  const sorted = [...assets].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, warning: 1, healthy: 2 };
    const diff = (order[a.status] ?? 3) - (order[b.status] ?? 3);
    if (diff !== 0) return diff;
    return a.symbol.localeCompare(b.symbol);
  });

  return (
    <div className="asset-grid">
      {sorted.map((asset) => (
        <div key={asset.symbol + "-" + asset.frequency} className={"asset-item " + asset.status}>
          <div className="asset-symbol">{asset.symbol}</div>
          <div className="asset-freq">{asset.frequency}</div>
          <div className={"asset-gap " + asset.status}>{asset.gapRatio.toFixed(2)}</div>
        </div>
      ))}
    </div>
  );
}
