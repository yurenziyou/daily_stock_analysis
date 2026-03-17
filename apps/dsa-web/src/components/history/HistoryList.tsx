import type React from 'react';
import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import type { HistoryItem } from '../../types/analysis';
import { getSentimentColor } from '../../types/analysis';
import { formatDateTime } from '../../utils/format';
import { Badge, Button, ScrollArea } from '../common';

interface HistoryListProps {
  items: HistoryItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  selectedId?: number;  // 当前选中的历史记录 ID
  selectedIds: Set<number>;
  isDeleting?: boolean;
  onItemClick: (recordId: number) => void;  // 点击记录的回调
  onReanalyze?: (stockCode: string) => void;  // Callback to reanalyze stock
  uniqueStocks?: Array<{code: string, name: string}>;  // 可筛选的股票列表
  filterStockCode?: string | null;  // 当前筛选的股票代码
  onFilterChange?: (stockCode: string | null) => void;  // 筛选变化回调
  onLoadMore: () => void;
  onToggleItemSelection: (recordId: number) => void;
  onToggleSelectAll: () => void;
  onDeleteSelected: () => void;
  className?: string;
}

/**
 * 历史记录列表组件 (升级版)
 * 使用新设计系统组件实现，支持批量选择、重新分析和筛选功能
 */
export const HistoryList: React.FC<HistoryListProps> = ({
  items,
  isLoading,
  isLoadingMore,
  hasMore,
  selectedId,
  selectedIds,
  isDeleting = false,
  onItemClick,
  onReanalyze,
  uniqueStocks,
  filterStockCode,
  onFilterChange,
  onLoadMore,
  onToggleItemSelection,
  onToggleSelectAll,
  onDeleteSelected,
  className = '',
}) => {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);

  const selectedCount = items.filter((item) => selectedIds.has(item.id)).length;
  const allVisibleSelected = items.length > 0 && selectedCount === items.length;
  const someVisibleSelected = selectedCount > 0 && !allVisibleSelected;

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

  // 设置全选复选框的 indeterminate 状态
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

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

  // 使用 IntersectionObserver 检测滚动到底部
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !isLoading && !isLoadingMore) {
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
      rootMargin: '20px',
      threshold: 0.1,
    });

    observer.observe(trigger);
    return () => observer.disconnect();
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
      <ScrollArea
        viewportRef={scrollContainerRef}
        viewportClassName="p-4"
        testId="home-history-list-scroll"
      >
        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-purple uppercase tracking-widest flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              历史分析
            </h2>
            <div className="flex items-center gap-2">
              {selectedCount > 0 && (
                <Badge variant="history" size="sm" className="animate-in fade-in zoom-in duration-200">
                  已选 {selectedCount}
                </Badge>
              )}
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

          {items.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 border border-white/5">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={onToggleSelectAll}
                  disabled={isDeleting}
                  aria-label="全选当前已加载历史记录"
                  className="w-3.5 h-3.5 rounded border-white/20 bg-transparent text-purple focus:ring-purple/40 cursor-pointer disabled:opacity-50"
                />
                <span className="text-[11px] text-muted-text select-none">全选当前</span>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={onDeleteSelected}
                disabled={selectedCount === 0 || isDeleting}
                isLoading={isDeleting}
                className="h-6 text-[9px] px-2"
              >
                {isDeleting ? '删除中' : '删除'}
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-cyan/10 border-t-cyan rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="mx-auto w-11 h-11 rounded-full bg-white/5 flex items-center justify-center text-muted-text/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-secondary-text">暂无历史分析记录</p>
              <p className="text-xs text-muted-text">完成首次分析后，这里会保留最近结果。</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-2 group">
                <div className="pt-5">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => onToggleItemSelection(item.id)}
                    disabled={isDeleting}
                    className="w-3.5 h-3.5 rounded border-white/20 bg-transparent text-purple focus:ring-purple/40 cursor-pointer disabled:opacity-50"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onItemClick(item.id)}
                  className={`flex-1 text-left p-2.5 rounded-xl transition-all duration-200 border relative overflow-hidden group/item ${
                    selectedId === item.id 
                      ? 'bg-purple/10 border-purple/30 border-cyan shadow-[0_0_15px_rgba(111,97,241,0.15)]'
                      : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                  }`}
                >
                  <div className="absolute inset-0 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none">
                    <div className="absolute inset-0 p-[1px] rounded-xl bg-gradient-to-br from-purple/15 via-transparent to-cyan/10" style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude' }} />
                  </div>
                  <div className="flex items-center gap-2.5 relative z-10">
                    {item.sentimentScore !== undefined && (
                      <div 
                        className="w-1 h-8 rounded-full flex-shrink-0"
                        style={{ 
                          backgroundColor: getSentimentColor(item.sentimentScore),
                          boxShadow: `0 0 10px ${getSentimentColor(item.sentimentScore)}40` 
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="truncate text-sm font-semibold text-white tracking-tight">
                            {item.stockName || item.stockCode}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {item.sentimentScore !== undefined && (
                            <span 
                              className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none"
                              style={{ 
                                color: getSentimentColor(item.sentimentScore),
                                borderColor: `${getSentimentColor(item.sentimentScore)}30`,
                                backgroundColor: `${getSentimentColor(item.sentimentScore)}10`
                              }}
                            >
                              {getOperationBadgeLabel(item.operationAdvice)} {item.sentimentScore}
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
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-secondary-text font-mono">
                          {item.stockCode}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                        <span className="text-[11px] text-muted-text">
                          {formatDateTime(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            ))}

            <div ref={loadMoreTriggerRef} className="h-4" />
            
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-cyan/10 border-t-cyan rounded-full animate-spin" />
              </div>
            )}

            {!hasMore && items.length > 0 && (
              <div className="text-center py-5">
                <div className="h-px bg-white/5 w-full mb-3" />
                <span className="text-[10px] text-muted-text/50 uppercase tracking-[0.2em]">已到底部</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
};
