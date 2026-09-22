import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { gym, type Member } from '@/data';

interface AppState {
  /** False until a saved session has been checked on launch. */
  sessionChecked: boolean;
  member: Member | null;
  signIn(email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;

  /** Session ids the member has booked (drives "BOOK CLASS" vs "BOOKED"). */
  bookedIds: ReadonlySet<string>;
  toggleBooking(sessionId: string): Promise<void>;

  /** Locally saved classes (bookmark icon on class rows). */
  bookmarks: ReadonlySet<string>;
  toggleBookmark(sessionId: string): void;

  calorieGoal: number;
  setCalorieGoal(kcal: number): Promise<void>;

  /** Bumped after any mutation so screens can refetch. */
  dataVersion: number;
  /** Call after a screen changes server data (check-in, payment…) so others refetch. */
  notifyChanged(): void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [calorieGoal, setGoal] = useState(2000);
  const [dataVersion, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  const hydrate = useCallback(async (m: Member) => {
    const [upcoming, goal] = await Promise.all([gym.getBookings(m.id, 'upcoming'), gym.getCalorieGoal(m.id)]);
    setBookedIds(new Set(upcoming.map((s) => s.id)));
    setGoal(goal);
    setMember(m);
  }, []);

  useEffect(() => {
    gym
      .restoreSession()
      .then((m) => (m ? hydrate(m) : undefined))
      .catch(() => {})
      .finally(() => setSessionChecked(true));
  }, [hydrate]);

  const value = useMemo<AppState>(
    () => ({
      sessionChecked,
      member,
      bookedIds,
      bookmarks,
      calorieGoal,
      dataVersion,
      notifyChanged: bump,

      async signIn(email, password) {
        await hydrate(await gym.signIn(email, password));
      },
      async signInWithGoogle() {
        await hydrate(await gym.signInWithGoogle());
      },
      async signOut() {
        await gym.signOut();
        setMember(null);
        setBookedIds(new Set());
      },

      async toggleBooking(sessionId) {
        if (!member) return;
        const isBooked = bookedIds.has(sessionId);
        // Optimistic update, rolled back on failure.
        setBookedIds((prev) => {
          const next = new Set(prev);
          if (isBooked) next.delete(sessionId);
          else next.add(sessionId);
          return next;
        });
        try {
          if (isBooked) await gym.cancelBooking(member.id, sessionId);
          else await gym.bookClass(member.id, sessionId);
          bump();
        } catch (e) {
          setBookedIds((prev) => {
            const next = new Set(prev);
            if (isBooked) next.add(sessionId);
            else next.delete(sessionId);
            return next;
          });
          throw e;
        }
      },

      toggleBookmark(sessionId) {
        setBookmarks((prev) => {
          const next = new Set(prev);
          if (next.has(sessionId)) next.delete(sessionId);
          else next.add(sessionId);
          return next;
        });
      },

      async setCalorieGoal(kcal) {
        if (!member) return;
        setGoal(await gym.setCalorieGoal(member.id, kcal));
        bump();
      },
    }),
    [sessionChecked, member, bookedIds, bookmarks, calorieGoal, dataVersion, hydrate],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

/** The signed-in member. Screens behind the auth gate can rely on it. */
export function useMember() {
  const { member } = useApp();
  if (!member) throw new Error('No signed-in member');
  return member;
}
