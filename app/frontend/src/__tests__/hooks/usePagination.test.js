import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../../hooks/usePagination';

describe('usePagination', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => usePagination());
    
    expect(result.current.page).toBe(1);
    expect(result.current.limit).toBe(50);
    expect(result.current.total).toBe(0);
  });

  it('accepts custom initial values', () => {
    const { result } = renderHook(() => usePagination({
      initialPage: 2,
      initialLimit: 25
    }));
    
    expect(result.current.page).toBe(2);
    expect(result.current.limit).toBe(25);
  });

  it('calculates totalPages correctly', () => {
    const { result } = renderHook(() => usePagination());
    
    act(() => {
      result.current.setTotal(100);
    });
    
    expect(result.current.totalPages).toBe(2); // 100 / 50 = 2
  });

  it('navigates to next page', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setTotal(100);
    });

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.page).toBe(2);
  });

  it('navigates to previous page', () => {
    const { result } = renderHook(() => usePagination({ initialPage: 3 }));
    
    act(() => {
      result.current.setTotal(200);
      result.current.prevPage();
    });
    
    expect(result.current.page).toBe(2);
  });

  it('does not go below page 1', () => {
    const { result } = renderHook(() => usePagination());
    
    act(() => {
      result.current.prevPage();
    });
    
    expect(result.current.page).toBe(1);
  });

  it('does not exceed totalPages', () => {
    const { result } = renderHook(() => usePagination());
    
    act(() => {
      result.current.setTotal(50); // 1 page
      result.current.nextPage();
    });
    
    expect(result.current.page).toBe(1);
  });

  it('resets page when limit changes', () => {
    const { result } = renderHook(() => usePagination({ initialPage: 3 }));
    
    act(() => {
      result.current.setLimit(100);
    });
    
    expect(result.current.page).toBe(1);
    expect(result.current.limit).toBe(100);
  });

  it('respects maxLimit', () => {
    const { result } = renderHook(() => usePagination({ maxLimit: 100 }));
    
    act(() => {
      result.current.setLimit(500);
    });
    
    expect(result.current.limit).toBe(100);
  });

  it('calculates pagination info correctly', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setTotal(120);
    });

    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.pagination.from).toBe(51);
    expect(result.current.pagination.to).toBe(100);
    expect(result.current.pagination.hasNext).toBe(true);
    expect(result.current.pagination.hasPrev).toBe(true);
  });

  it('resets to initial state', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setTotal(100);
    });

    act(() => {
      result.current.setPage(2);
    });

    act(() => {
      result.current.reset();
    });
    
    expect(result.current.page).toBe(1);
    expect(result.current.total).toBe(0);
  });
});
