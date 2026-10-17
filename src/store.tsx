import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { Session } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { currentMonth, emptyLedger, Ledger, validateLedger } from "./domain";
import { cloud, cloudCall, Household, readHousehold } from "./cloud";
const KEY = "@nepnha/ledger/v1";
type Store = {
  data: Ledger;
  month: string;
  setMonth: (m: string) => void;
  ready: boolean;
  error: string;
  busy: boolean;
  session: Session | null;
  household: Household | null;
  save: (next: Ledger, expected?: number) => Promise<void>;
  reload: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Ledger>(emptyLedger),
    [month, setMonth] = useState(currentMonth),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [session, setSession] = useState<Session | null>(null),
    [household, setHousehold] = useState<Household | null>(null);
  const lock = useRef(false),
    loadVersion = useRef(0);
  const reload = useCallback(async () => {
    if (lock.current) return;
    const version = ++loadVersion.current;
    try {
      const auth = cloud ? await cloud.auth.getSession() : null;
      if (auth?.error) throw auth.error;
      const current = auth?.data.session ?? null;
      const family = current ? await readHousehold() : null;
      const raw = family ? null : await AsyncStorage.getItem(KEY);
      if (version !== loadVersion.current) return;
      setSession(current);
      setHousehold(family);
      setData(
        family
          ? family.ledger
          : raw
            ? validateLedger(JSON.parse(raw))
            : emptyLedger(),
      );
      setError("");
      setReady(true);
    } catch {
      if (version === loadVersion.current)
        setError(
          "Không tải được dữ liệu. Kiểm tra kết nối và thử làm mới. Dữ liệu gốc chưa bị thay đổi.",
        );
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(reload);
    const auth = cloud?.auth.onAuthStateChange(() => {
      setTimeout(() => void reload(), 0);
    });
    const timer = setInterval(() => {
      if (cloud && AppState.currentState === "active") void reload();
    }, 15000);
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        cloud?.auth.startAutoRefresh();
        void reload();
      } else cloud?.auth.stopAutoRefresh();
    });
    return () => {
      auth?.data.subscription.unsubscribe();
      clearInterval(timer);
      app.remove();
    };
  }, [reload]);
  async function save(next: Ledger, expected?: number) {
    if (!ready) throw Error("Chưa đọc xong dữ liệu.");
    if (lock.current) throw Error("Đang lưu, vui lòng đợi một chút.");
    lock.current = true;
    setBusy(true);
    ++loadVersion.current;
    try {
      const checked = validateLedger(next);
      if (household) {
        const revision = expected ?? household.revision;
        if (revision !== household.revision)
          throw Error(
            "Dữ liệu nhóm vừa thay đổi. Đóng màn hình và mở lại trước khi lưu.",
          );
        const row: Household = await cloudCall("save_my_ledger", {
          p_revision: revision,
          p_ledger: checked,
        });
        setHousehold(row);
        setData(validateLedger(row.ledger));
      } else {
        await AsyncStorage.setItem(KEY, JSON.stringify(checked));
        setData(checked);
      }
      setError("");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Context.Provider
      value={{
        data,
        month,
        setMonth,
        ready,
        error,
        busy,
        session,
        household,
        save,
        reload,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLedger() {
  const value = useContext(Context);
  if (!value) throw Error("Missing provider");
  return value;
}
