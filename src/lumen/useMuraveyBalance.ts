import { useState, useEffect, useCallback } from "react";

const AUTH_URL = import.meta.env.VITE_AUTH_URL || "";
const DEVICE_ID_KEY = "muravey_device_id";

export interface MuraveyBalance {
  free_requests_left: number;
  paid_requests_balance: number;
  total_requests_left: number;
  can_send: boolean;
  email: string | null;
}

export interface PaymentResult {
  ok: boolean;
  test_mode: boolean;
  payment_id: string;
  db_payment_id: number;
  package: string;
  amount_rub: number;
  requests_count: number;
  sop_payload: string | null;
}

export function useMuraveyBalance(isAdmin: boolean) {
  const [balance, setBalance] = useState<MuraveyBalance | null>(null);

  const refreshBalance = useCallback(async () => {
    // ÐÑÐ¸Ð½ÑÐ´Ð¸ÑÐµÐ»ÑÐ½ÑÐ¹ Ð±ÐµÐ·Ð»Ð¸Ð¼Ð¸Ñ Ð´Ð»Ñ Ð²Ð»Ð°Ð´ÐµÐ»ÑÑÐ°
    setBalance({
      free_requests_left: 999999,
      paid_requests_balance: 999999,
      total_requests_left: 999999,
      can_send: true,
      email: "admin@lumin.pro"
    });
  }, []);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  const createPayment = async (packageId: string, email: string, phone: string): Promise<PaymentResult | { error: string }> => {
    return { error: "ÐÐ»Ð°ÑÐµÐ¶Ð¸ Ð¾ÑÐºÐ»ÑÑÐµÐ½Ñ Ð´Ð»Ñ Ð°Ð´Ð¼Ð¸Ð½Ð¸ÑÑÑÐ°ÑÐ¾ÑÐ°" };
  };

  const restoreByEmail = useCallback(async (email: string) => {
    refreshBalance();
  }, [refreshBalance]);

  return {
    balance,
    refreshBalance,
    createPayment,
    restoreByEmail
  };
}
