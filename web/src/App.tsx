import { Activity, BookOpen, CalendarCheck, Ellipsis } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { api, type About, type Me } from './api';
import { Auth } from './pages/Auth';
import { Course } from './pages/Course';
import { Courses } from './pages/Courses';
import { Landing } from './pages/Landing';
import { More } from './pages/More';
import { PulsePage } from './pages/PulsePage';
import { Session } from './pages/Session';
import { TodayPage } from './pages/Today';
import { Brand, Doodles, Loading } from './ui';

type Account = {
  me: Me | null;
  about: About | null;
  setMe: (me: Me | null) => void;
  signOut: () => Promise<void>;
};

const AccountContext = createContext<Account>({ me: null, about: null, setMe: () => undefined, signOut: async () => undefined });

export const useAccount = () => useContext(AccountContext);

export function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [about, setAbout] = useState<About | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    api.get<About>('/api/about').then(setAbout).catch(() => undefined);
    api.get<Me>('/api/me').then(setMe).catch(() => setMe(null)).finally(() => setChecked(true));
  }, []);

  const signOut = useCallback(async () => {
    await api.post('/api/auth/logout').catch(() => undefined);
    setMe(null);
  }, []);

  if (!checked) return <Loading />;

  return (
    <AccountContext.Provider value={{ me, about, setMe, signOut }}>
      <Routes>
        <Route path="/" element={me ? <Navigate to="/today" replace /> : <Landing />} />
        <Route path="/sign-in" element={me ? <Navigate to="/today" replace /> : <Auth mode="sign-in" />} />
        <Route path="/sign-up" element={me ? <Navigate to="/today" replace /> : <Auth mode="sign-up" />} />
        <Route path="/practice" element={<Private><Session /></Private>} />
        <Route path="/today" element={<Private><Shell><TodayPage /></Shell></Private>} />
        <Route path="/courses" element={<Private><Shell><Courses /></Shell></Private>} />
        <Route path="/courses/:id" element={<Private><Shell><Course /></Shell></Private>} />
        <Route path="/pulse" element={<Private><Shell><PulsePage /></Shell></Private>} />
        <Route path="/more" element={<Private><Shell><More /></Shell></Private>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AccountContext.Provider>
  );
}

function Private({ children }: { children: ReactNode }) {
  const { me } = useAccount();
  const location = useLocation();
  if (!me) return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

const tabs = [
  { to: '/today', label: 'Today', icon: CalendarCheck },
  { to: '/courses', label: 'Courses', icon: BookOpen },
  { to: '/pulse', label: 'Pulse', icon: Activity },
  { to: '/more', label: 'More', icon: Ellipsis },
];

const spring = { type: 'spring', stiffness: 420, damping: 32 } as const;

function Shell({ children }: { children: ReactNode }) {
  const { me } = useAccount();
  const location = useLocation();
  const section = `/${location.pathname.split('/')[1]}`;
  return (
    <div className="shell">
      <div className="glow" aria-hidden="true" />
      <Doodles fixed only={['π', 'cell', '∑', 'mito', 'dna', 'atom', '∫', 'flask']} />
      {me?.isDemo && (
        <div className="demo-banner">
          You are in the demo, with made-up study history. <Link to="/more">Make it yours</Link>
        </div>
      )}
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" to="/today"><Brand /></Link>
          <nav className="topnav" aria-label="Main">
            {tabs.map((tab) => (
              <NavLink key={tab.to} to={tab.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                {section === tab.to && <motion.span layoutId="top-pill" className="tab-pill" transition={spring} />}
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      {/* Each screen slides up a little as it arrives. */}
      <AnimatePresence mode="wait">
        <motion.main key={location.pathname} className="page" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
          {children}
        </motion.main>
      </AnimatePresence>
      <nav className="tabbar" aria-label="Main">
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {section === tab.to && <motion.span layoutId="tab-pill" className="tab-pill" transition={spring} />}
            <tab.icon aria-hidden />
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
