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
import { cloud, cloudCall, Household, Profile, readAccount } from "./cloud";
const KEY = "@nepnha/ledger/accounts-v2";
type Store = {
  data: Ledger;
  month: string;
  setMonth: (m: string) => void;
  ready: boolean;
  error: string;
  busy: boolean;
  session: Session | null;
  household: Household | null;
  profile: Profile | null;
  canEdit: (entry: Ledger["entries"][number]) => boolean;
  isOwner: boolean;
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
    [profile, setProfile] = useState<Profile | null>(null),
    [household, setHousehold] = useState<Household | null>(null);
  const lock = useRef(false),
    loadVersion = useRef(0);
  const authUid = useRef<string | null>(null);
  const reload = useCallback(async () => {
    if (lock.current) return;
    const version = ++loadVersion.current;
    try {
      const auth = cloud ? await cloud.auth.getSession() : null;
      if (auth?.error) throw auth.error;
      const current = auth?.data.session ?? null;
      const account = current ? await readAccount() : null;
      const family = account?.book ?? null;
      await AsyncStorage.removeItem("@nepnha/ledger/v1");
      const raw = family ? null : await AsyncStorage.getItem(KEY);
      if (version !== loadVersion.current) return;
      setSession(current);
      authUid.current = current?.user.id ?? null;
      setProfile(account?.profile ?? null);
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
    const auth = cloud?.auth.onAuthStateChange((_event, nextSession) => {
      const nextUid = nextSession?.user.id ?? null;
      if (nextUid !== authUid.current) {
        authUid.current = nextUid;
        ++loadVersion.current;
        setSession(nextSession);
        setProfile(null);
        setHousehold(null);
        setData(emptyLedger());
        setReady(false);
      }
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
    const saveVersion = ++loadVersion.current;
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
          p_book_id: household.id,
          p_client_epoch: "accounts-v2",
        });
        if (
          saveVersion !== loadVersion.current ||
          authUid.current !== session?.user.id
        )
          throw Error("Tài khoản vừa thay đổi. Hãy mở lại sổ.");
        setHousehold(row);
        setData(validateLedger(row.ledger));
      } else {
        await AsyncStorage.setItem(KEY, JSON.stringify(checked));
        if (saveVersion !== loadVersion.current)
          throw Error("Tài khoản vừa thay đổi. Hãy mở lại sổ.");
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
        profile,
        isOwner:
          !household?.is_family || household.owner_id === session?.user.id,
        canEdit: (entry) =>
          !session ||
          household?.owner_id === session.user.id ||
          entry.created_by === session.user.id,
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
