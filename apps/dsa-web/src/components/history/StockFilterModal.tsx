import type React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { historyApi, type StockFilterItem } from '../../api/history';
import { formatDateTime } from '../../utils/format';

interface StockFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (stockCode: string) => void;
}

export const StockFilterModal: React.FC<StockFilterModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [stocks, setStocks] = useState<StockFilterItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && stocks.length === 0) {
      setIsLoading(true);
      historyApi.getUniqueStocks().then((data) => {
        setStocks(data);
        setIsLoading(false);
      }).catch(() => {
        setIsLoading(false);
      });
    }
  }, [isOpen, stocks.length]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredStocks = useMemo(() => {
    if (!searchQuery.trim()) {
      return stocks;
    }
    const q = searchQuery.toLowerCase();
    return stocks.filter(
      (s) =>
        s.stockCode.toLowerCase().includes(q) ||
        (s.stockName && s.stockName.toLowerCase().includes(q))
    );
  }, [stocks, searchQuery]);

  if (!isOpen) return null;

  const handleSelect = (stockCode: string) => {
    onSelect(stockCode);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className="mx-4 flex w-full max-w-md flex-col rounded-xl border border-border/70 bg-elevated shadow-2xl animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <h3 className="text-base font-medium text-foreground">筛选股票</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-secondary-text transition-colors hover:bg-hover hover:text-foreground"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="border-b border-border/50 px-5 py-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="输入股票代码或名称搜索"
            className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-text focus:border-[var(--home-accent-border-hover)] focus:outline-none"
            autoFocus
          />
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--home-accent-text)] border-t-transparent" />
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="py-8 text-center text-sm text-secondary-text">
              {searchQuery ? '未找到匹配结果' : '暂无已分析股票'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredStocks.map((stock) => (
                <button
                  key={stock.stockCode}
                  type="button"
                  onClick={() => handleSelect(stock.stockCode)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-hover"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground font-mono">
                      {stock.stockCode}
                    </span>
                    <span className="text-sm text-secondary-text">
                      {stock.stockName || '-'}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-text">
                    {stock.lastAnalyzedAt ? formatDateTime(stock.lastAnalyzedAt) : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
