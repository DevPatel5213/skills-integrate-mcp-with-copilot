import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';

type Activity = {
  description: string;
  schedule: string;
  max_participants: number;
  participants: string[];
};

type ActivitiesResponse = Record<string, Activity>;

type MessageState = {
  kind: 'success' | 'error';
  text: string;
};

async function fetchActivities() {
  const response = await fetch('/activities');
  if (!response.ok) {
    throw new Error('Failed to load activities');
  }

  return (await response.json()) as ActivitiesResponse;
}

function useActivities() {
  const [activities, setActivities] = useState<ActivitiesResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchActivities()
      .then((data) => {
        if (active) {
          setActivities(data);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load activities');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { activities, loading, error, refresh: async () => setActivities(await fetchActivities()) };
}

function Header() {
  return (
    <header className="hero">
      <div>
        <p className="eyebrow">Mergington High School</p>
        <h1>Extracurricular Activities</h1>
        <p className="hero-copy">
          Browse activities, open a detail page, and manage sign-ups from a React + TypeScript UI.
        </p>
      </div>
      <Link className="hero-link" to="/">
        View all activities
      </Link>
    </header>
  );
}

function ActivityCard({ name, activity }: { name: string; activity: Activity }) {
  const spotsLeft = activity.max_participants - activity.participants.length;

  return (
    <article className="card">
      <div className="card-topline">
        <h2>{name}</h2>
        <span>{spotsLeft} spots left</span>
      </div>
      <p>{activity.description}</p>
      <p>
        <strong>Schedule:</strong> {activity.schedule}
      </p>
      <p>
        <strong>Participants:</strong> {activity.participants.length}
      </p>
      <Link className="card-link" to={`/activity/${encodeURIComponent(name)}`}>
        Open details
      </Link>
    </article>
  );
}

function HomePage() {
  const { activities, loading, error } = useActivities();
  const activityEntries = useMemo(() => Object.entries(activities), [activities]);

  return (
    <main className="layout">
      <section className="panel">
        <h2>Available Activities</h2>
        {loading && <p className="muted">Loading activities...</p>}
        {error && <p className="message error">{error}</p>}
        <div className="grid">
          {activityEntries.map(([name, activity]) => (
            <ActivityCard key={name} name={name} activity={activity} />
          ))}
        </div>
      </section>
      <section className="panel panel-side">
        <h2>What is new here</h2>
        <ul className="feature-list">
          <li>React component structure</li>
          <li>Browser routes for home and detail pages</li>
          <li>Vite dev server proxying API requests to FastAPI</li>
        </ul>
      </section>
    </main>
  );
}

function ActivityPage() {
  const { name = '' } = useParams();
  const navigate = useNavigate();
  const decodedName = decodeURIComponent(name);
  const { activities, loading, error, refresh } = useActivities();
  const activity = activities[decodedName];
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<MessageState | null>(null);

  async function handleSignup() {
    if (!email.trim()) {
      setMessage({ kind: 'error', text: 'Please enter a student email.' });
      return;
    }

    const response = await fetch(`/activities/${encodeURIComponent(decodedName)}/signup?email=${encodeURIComponent(email)}`, {
      method: 'POST'
    });
    const result = (await response.json()) as { message?: string; detail?: string };

    if (!response.ok) {
      setMessage({ kind: 'error', text: result.detail || 'Unable to sign up.' });
      return;
    }

    setMessage({ kind: 'success', text: result.message || 'Signed up successfully.' });
    setEmail('');
    await refresh();
  }

  async function handleUnregister(participantEmail: string) {
    const response = await fetch(
      `/activities/${encodeURIComponent(decodedName)}/unregister?email=${encodeURIComponent(participantEmail)}`,
      { method: 'DELETE' }
    );
    const result = (await response.json()) as { message?: string; detail?: string };

    if (!response.ok) {
      setMessage({ kind: 'error', text: result.detail || 'Unable to unregister.' });
      return;
    }

    setMessage({ kind: 'success', text: result.message || 'Unregistered successfully.' });
    await refresh();
  }

  if (loading) {
    return <p className="muted">Loading activity...</p>;
  }

  if (error) {
    return <p className="message error">{error}</p>;
  }

  if (!activity) {
    return <Navigate to="/" replace />;
  }

  const spotsLeft = activity.max_participants - activity.participants.length;

  return (
    <main className="layout detail-layout">
      <section className="panel">
        <button className="back-button" onClick={() => navigate(-1)} type="button">
          Back
        </button>
        <h2>{decodedName}</h2>
        <p>{activity.description}</p>
        <div className="detail-meta">
          <p>
            <strong>Schedule:</strong> {activity.schedule}
          </p>
          <p>
            <strong>Capacity:</strong> {activity.participants.length}/{activity.max_participants}
          </p>
          <p>
            <strong>Availability:</strong> {spotsLeft} spots left
          </p>
        </div>

        <div className="signup-box">
          <label htmlFor="email">Student Email</label>
          <div className="signup-row">
            <input
              id="email"
              type="email"
              placeholder="your-email@mergington.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button onClick={handleSignup} type="button">
              Sign Up
            </button>
          </div>
        </div>

        {message && <p className={`message ${message.kind}`}>{message.text}</p>}
      </section>

      <section className="panel panel-side">
        <h2>Participants</h2>
        {activity.participants.length === 0 ? (
          <p className="muted">No participants yet.</p>
        ) : (
          <ul className="participant-list">
            {activity.participants.map((participantEmail) => (
              <li key={participantEmail}>
                <span>{participantEmail}</span>
                <button className="ghost-button" onClick={() => handleUnregister(participantEmail)} type="button">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/activity/:name" element={<ActivityPage />} />
      </Routes>
    </div>
  );
}