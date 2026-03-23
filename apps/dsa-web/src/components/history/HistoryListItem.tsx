import type React from 'react';
import type { HistoryItem } from '../../types/analysis';
import { getSentimentColor } from '../../types/analysis';
import { formatDateTime } from '../../utils/format';

interface HistoryListItemProps {
  item: HistoryItem;
  isViewing: boolean;
  isChecked: boolean;
  isDeleting: boolean;
  onToggleChecked: (recordId: number) => void;
  onClick: (recordId: number) => void;
  onQuickAnalyze?: (stockCode: string, stockName: string) => void;
}

const getOperationBadgeLabel = (advice?: string) => {
  const normalized = advice?.trim();
  if (!normalized) {
    return '情绪';
  }
  if (normalized.includes('减仓')) {
    return '减仓';
  }
  if (normalized.includes('卖')) {
    return '卖出';
  }
  if (normalized.includes('观望') || normalized.includes('等待')) {
    return '观望';
  }
  if (normalized.includes('买') || normalized.includes('布局')) {
    return '买入';
  }
  return normalized.split(/[，。；、\s]/)[0] || '建议';
};

export const HistoryListItem: React.FC<HistoryListItemProps> = ({
  item,
  isViewing,
  isChecked,
  isDeleting,
  onToggleChecked,
  onClick,
  onQuickAnalyze,
}) => {
  return (
    <div className="flex items-start gap-2 group">
      <div className="pt-5">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onToggleChecked(item.id)}
          disabled={isDeleting}
          className="h-3.5 w-3.5 cursor-pointer rounded border-subtle-hover bg-transparent text-[var(--home-accent-text)] focus:ring-[color:var(--home-accent-border-hover)] disabled:opacity-50"
        />
      </div>
      <button
        type="button"
        onClick={() => onClick(item.id)}
        className={`home-history-item flex-1 text-left p-2.5 group/item ${
          isViewing ? 'home-history-item-selected' : ''
        }`}
      >
        <div className="flex items-center gap-2.5 relative z-10">
          {item.sentimentScore !== undefined && (
            <div
              className="w-1 h-8 rounded-full flex-shrink-0"
              style={{
                backgroundColor: getSentimentColor(item.sentimentScore),
                boxShadow: `0 0 10px ${getSentimentColor(item.sentimentScore)}40`,
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="truncate text-sm font-semibold text-foreground tracking-tight">
                  {item.stockName || item.stockCode}
                </span>
              </div>
              {item.sentimentScore !== undefined && (
                <span
                  className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none"
                  style={{
                    color: getSentimentColor(item.sentimentScore),
                    borderColor: `${getSentimentColor(item.sentimentScore)}30`,
                    backgroundColor: `${getSentimentColor(item.sentimentScore)}10`,
                  }}
                >
                  {getOperationBadgeLabel(item.operationAdvice)} {item.sentimentScore}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-secondary-text font-mono">
                {item.stockCode}
              </span>
              <span className="w-1 h-1 rounded-full bg-subtle-hover" />
              <span className="text-[11px] text-muted-text">
                {formatDateTime(item.createdAt)}
              </span>
              {onQuickAnalyze && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAnalyze(item.stockCode, item.stockName || item.stockCode);
                  }}
                  disabled={isDeleting}
                  title="快速重新分析"
                  className="ml-auto flex-shrink-0 rounded-lg p-1 opacity-0 group-hover:opacity-100 group-hover/item:opacity-100 transition-opacity text-secondary-text hover:bg-hover hover:text-foreground disabled:opacity-50"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
};
