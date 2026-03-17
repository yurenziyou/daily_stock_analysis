import type React from 'react';
import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import type { HistoryItem } from '../../types/analysis';
import { getSentimentColor } from '../../types/analysis';
import { formatDateTime } from '../../utils/format';

interface HistoryListProps {
  items: HistoryItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  selectedId?: number;  // Selected history record ID
  onItemClick: (recordId: number) => void;  // Callback with record ID
  onReanalyze?: (stockCode: string) => void;  // Callback to reanalyze stock
  uniqueStocks?: Array<{code: string, name: string}>;  // 可筛选的股票列表
  filterStockCode?: string | null;  // 当前筛选的股票代码
  onFilterChange?: (stockCode: string | null) => void;  // 筛选变化回调
  onLoadMore: () => void;
  className?: string;
}

/**
 * 历史记录列表组件
 * 显示最近的股票分析历史，支持点击查看详情和滚动加载更多
 */
export const HistoryList: React.FC<HistoryListProps> = ({
  items,
  isLoading,
  isLoadingMore,
  hasMore,
  selectedId,
  onItemClick,
  onReanalyze,
  uniqueStocks,
  filterStockCode,
  onFilterChange,
  onLoadMore,
  className = '',
}) => {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);

  // 当下拉列表关闭时清空搜索
  useEffect(() => {
    if (!showFilterDropdown) {
      setSearchQuery('');
    }
  }, [showFilterDropdown]);

  // 过滤股票列表
  const filteredStocks = useMemo(() => {
    if (!uniqueStocks) return [];
    if (!searchQuery.trim()) return uniqueStocks;
    
    const query = searchQuery.toLowerCase();
    return uniqueStocks.filter(stock => 
      stock.code.toLowerCase().includes(query) || 
      stock.name.toLowerCase().includes(query)
    );
  }, [uniqueStocks, searchQuery]);

  // 使用 IntersectionObserver 检测滚动到底部
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      // 只有当触发器真正可见且有更多数据时才加载
      if (target.isIntersecting && hasMore && !isLoading && !isLoadingMore) {
        // 确保容器有滚动能力（内容超过容器高度）
        const container = scrollContainerRef.current;
        if (container && container.scrollHeight > container.clientHeight) {
          onLoadMore();
        }
      }
    },
    [hasMore, isLoading, isLoadingMore, onLoadMore]
  );

  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    const container = scrollContainerRef.current;
    if (!trigger || !container) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: container,
      rootMargin: '20px', // 减小预加载距离
      threshold: 0.1, // 触发器至少 10% 可见时才触发
    });

    observer.observe(trigger);

    return () => {
      observer.disconnect();
    };
  }, [handleObserver]);

  // 点击外部关闭下拉列表
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideDropdown = dropdownRef.current?.contains(target) || dropdownContentRef.current?.contains(target);
      if (!isInsideDropdown) {
        setShowFilterDropdown(false);
      }
    };

    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterDropdown]);

  return (
    <aside className={`glass-card overflow-hidden flex flex-col ${className}`}>
      <div ref={scrollContainerRef} className="p-3 flex-1 overflow-y-auto">
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-purple uppercase tracking-wider flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              历史记录
            </h2>
            {uniqueStocks && uniqueStocks.length > 0 && onFilterChange && (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${filterStockCode ? 'bg-cyan/10 text-cyan border border-cyan/20' : 'text-muted hover:text-white hover:bg-white/5'}`}
                  title="筛选股票"
                  aria-label="筛选股票"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {filterStockCode ? '已筛选' : '筛选'}
                  {filterStockCode && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFilterChange(null);
                      }}
                      className="ml-1 p-0.5 text-muted hover:text-white rounded-full hover:bg-white/10"
                      title="清空筛选"
                      aria-label="清空筛选"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </button>
                {showFilterDropdown && uniqueStocks && uniqueStocks.length > 0 && onFilterChange && (
                  <div className="absolute right-0 top-full mt-1 z-50" ref={dropdownContentRef} style={{ width: '220px' }}>
                    <div className="bg-[#1a1f2e] border border-white/10 shadow-2xl rounded-lg overflow-hidden">
                      <div className="p-2 border-b border-white/5">
                        <div className="text-xs text-muted px-2 py-1 mb-1">选择股票</div>
                        <div className="relative">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索代码或名称..."
                            className="w-full bg-[#0f141f] border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-muted focus:outline-none focus:border-cyan/50"
                            autoFocus
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery('')}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-0.5 text-muted hover:text-white"
                              title="清空搜索"
                              aria-label="清空搜索"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto bg-[#1a1f2e]">
                        {filteredStocks.length === 0 ? (
                          <div className="px-3 py-4 text-center text-xs text-muted">
                            {searchQuery ? '未找到匹配的股票' : '暂无股票数据'}
                          </div>
                        ) : (
                          filteredStocks.map((stock) => (
                            <button
                              key={stock.code}
                              type="button"
                              onClick={() => {
                                onFilterChange(stock.code);
                                setShowFilterDropdown(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs transition-colors ${filterStockCode === stock.code ? 'bg-cyan/10 text-cyan' : 'text-white hover:bg-white/5'}`}
                            >
                              <div className="font-medium">{stock.name}</div>
                              <div className="text-muted font-mono">{stock.code}</div>
                            </button>
                          ))
                        )}
                        {filterStockCode && (
                          <button
                            type="button"
                            onClick={() => {
                              onFilterChange(null);
                              setShowFilterDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-muted hover:text-white hover:bg-white/5 border-t border-white/5"
                          >
                            清空筛选条件
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-6 text-muted text-xs">
            暂无历史记录
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onItemClick(item.id)}
                className={`history-item w-full text-left ${selectedId === item.id ? 'active' : ''
                  }`}
              >
                <div className="flex items-center gap-2 w-full">
                  {/* 情感分数指示条 */}
                  {item.sentimentScore !== undefined && (
                    <span
                      className="w-0.5 h-8 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: getSentimentColor(item.sentimentScore),
                        boxShadow: `0 0 6px ${getSentimentColor(item.sentimentScore)}40`
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-medium text-white truncate text-xs">
                        {item.stockName || item.stockCode}
                      </span>
                      <div className="flex items-center gap-1">
                        {item.sentimentScore !== undefined && (
                          <span
                            className="text-xs font-mono font-semibold px-1 py-0.5 rounded"
                            style={{
                              color: getSentimentColor(item.sentimentScore),
                              backgroundColor: `${getSentimentColor(item.sentimentScore)}15`
                            }}
                          >
                            {item.sentimentScore}
                          </span>
                        )}
                        {onReanalyze && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReanalyze(item.stockCode);
                            }}
                            className="p-1 text-muted hover:text-cyan transition-colors rounded hover:bg-white/5"
                            title="重新分析"
                            aria-label="重新分析"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-muted font-mono">
                        {item.stockCode}
                      </span>
                      <span className="text-xs text-muted/50">·</span>
                      <span className="text-xs text-muted">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {/* 加载更多触发器 */}
            <div ref={loadMoreTriggerRef} className="h-4" />

            {/* 加载更多状态 */}
            {isLoadingMore && (
              <div className="flex justify-center py-3">
                <div className="w-4 h-4 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
              </div>
            )}

            {/* 没有更多数据提示 */}
            {!hasMore && items.length > 0 && (
              <div className="text-center py-2 text-muted/50 text-xs">
                已加载全部
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
