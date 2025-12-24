import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'

// Define types for IPC
declare global {
  interface Window {
    ipcRenderer: {
      startTracking: (projectId: string) => Promise<any>
      stopTracking: () => Promise<any>
      on: (channel: string, func: (...args: any[]) => void) => void
      off: (channel: string, func: (...args: any[]) => void) => void
    }
  }
}

function App() {
  const [isTracking, setIsTracking] = useState(false)
  const [timer, setTimer] = useState(0)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let interval: any
    if (isTracking) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1)
      }, 1000)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [isTracking])

  useEffect(() => {
    const handleCapture = async (event: any, data: any) => {
      if (!user) return;

      try {
        const { screenshotBuffer, ...metadata } = data;

        // 1. Create a session if not exists
        // (Simplify for MVP: find active session or create new one)
        let { data: sessionData } = await supabase
          .from('time_sessions')
          .select('id')
          .eq('user_id', user.id)
          .is('ended_at', null)
          .single();

        let sessionId = sessionData?.id;
        if (!sessionId) {
          const { data: newSession, error } = await supabase
            .from('time_sessions')
            .insert([{ user_id: user.id, started_at: metadata.startTime }])
            .select()
            .single();
          if (error) throw error;
          sessionId = newSession.id;
        }

        // 2. Upload screenshot to Storage
        const fileName = `${user.id}/${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('tracker_captures')
          .upload(fileName, screenshotBuffer, { contentType: 'image/png' });

        if (uploadError) throw uploadError;

        // 3. Save log to DB
        const { error: logError } = await supabase
          .from('activity_logs')
          .insert([{
            session_id: sessionId,
            user_id: user.id,
            started_at: metadata.startTime,
            ended_at: metadata.endTime,
            activity_percentage: metadata.activityPercentage,
            window_title: metadata.windowTitle,
            app_name: metadata.appName,
            url: metadata.url,
            screenshot_path: fileName
          }]);

        if (logError) throw logError;
        console.log('Capture uploaded successfully!');
      } catch (err) {
        console.error('Failed to sync capture:', err);
      }
    };

    window.ipcRenderer.on('capture-ready', handleCapture);
    return () => window.ipcRenderer.off('capture-ready', handleCapture);
  }, [user]);

  const handleStart = async () => {
    if (!user) return alert('Please login first')
    await window.ipcRenderer.startTracking({ projectId: null, userId: user.id })
    setIsTracking(true)
  }

  const handleStop = async () => {
    await window.ipcRenderer.stopTracking()
    setIsTracking(false)
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleLogin = async () => {
    // For Electron, OAuth flow is tricky. We'll use email/password for now or Magic Link (requires deep linking).
    // Simple email prompt for MVP
    const email = prompt('Enter your email')
    if (email) {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) alert(error.message)
      else alert('Check your email for the login link!')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8">Intelligent Time Tracker</h1>

      {!user ? (
        <button
          onClick={handleLogin}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Login with Email
        </button>
      ) : (
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          <div className="text-sm text-gray-400">Logged in as: {user.email}</div>

          <div className="text-6xl font-mono font-bold tracking-widest text-blue-400 drop-shadow-lg">
            {formatTime(timer)}
          </div>

          <div className="flex gap-4">
            {!isTracking ? (
              <button
                onClick={handleStart}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full text-xl transition transform hover:scale-105"
              >
                Start Tracking
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full text-xl transition transform hover:scale-105 animate-pulse"
              >
                Stop
              </button>
            )}
          </div>

          <div className="w-full bg-gray-800 rounded-lg p-4 mt-8">
            <h3 className="text-lg font-semibold mb-2 text-gray-300">Recent Activity</h3>
            <div className="text-gray-500 text-sm italic">No recent activity logs...</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
