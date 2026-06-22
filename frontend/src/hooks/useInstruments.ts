import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Instrument, PaginatedResponse, AlertStatus } from '@/types';

interface UseInstrumentsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  ordering?: string;
  alertStatus?: AlertStatus | '';
}

interface UseInstrumentsResult {
  instruments: Instrument[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches instruments with sorting, searching, pagination, and
 * alert_status filtering. Defaults to sorting by the soonest
 * calibration due date first (the core requirement — instruments
 * about to expire show at the top).
 */
export function useInstruments(params: UseInstrumentsParams): UseInstrumentsResult {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const fetchInstruments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams: Record<string, string | number> = {
        page: params.page || 1,
        page_size: params.pageSize || 20,
      };

      if (params.search) {
        queryParams.search = params.search;
      }

      if (params.ordering) {
        queryParams.ordering = params.ordering;
      }

      if (params.alertStatus) {
        queryParams.alert_status = params.alertStatus;
      }

      const response = await api.get<PaginatedResponse<Instrument>>(
        '/instruments/',
        { params: queryParams }
      );

      setInstruments(response.data.results);
      setTotalCount(response.data.count);
      setTotalPages(response.data.total_pages);
      setCurrentPage(response.data.current_page);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.detail || 'Failed to load instruments.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [params.page, params.pageSize, params.search, params.ordering, params.alertStatus]);

  useEffect(() => {
    fetchInstruments();
  }, [fetchInstruments, refetchTrigger]);

  const refetch = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  return {
    instruments,
    totalCount,
    totalPages,
    currentPage,
    isLoading,
    error,
    refetch,
  };
}
